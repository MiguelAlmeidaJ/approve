import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  CalendarStage,
  Channel,
  ContentStage,
  ContentStatus,
  ContentType,
  UserRole
} from "@approve/database";
import { randomBytes, scryptSync } from "node:crypto";
import type { InternalActor } from "../common/internal-actor";
import { NextcloudService } from "../nextcloud/nextcloud.service";
import { PrismaService } from "../prisma.service";
import {
  AssignClientDto,
  AttachArtworkDto,
  CreateCalendarDto,
  CreateClientDto,
  CreateContentFormatDto,
  CreateContentItemDto,
  CreateDesignerDto,
  CreatePlanningItemDto,
  MarkScheduledDto,
  MarkSchedulingErrorDto,
  MoveContentItemDto,
  UpdateCalendarDto,
  UpdateClientDto,
  UpdateContentFormatDto,
  UpdatePlanningItemDto,
  UpdateUserDto
} from "./admin.dto";

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");

  return `scrypt:${salt}:${hash}`;
}

function normalizeNextcloudPath(value?: string) {
  const raw = value?.trim();

  if (!raw) {
    return null;
  }

  const normalized = raw.replaceAll("\\", "/");
  const segments = normalized.split("/").filter(Boolean);

  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new BadRequestException("A pasta do Nextcloud é inválida.");
  }

  return segments.length === 0 ? "/" : `/${segments.join("/")}`;
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function saoPauloDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(value);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function parseCalendarDates(
  periodStartValue: string,
  periodEndValue: string,
  postingDayValues: string[]
) {
  const periodStart = new Date(periodStartValue);
  const periodEnd = new Date(periodEndValue);
  const postingDays = [
    ...new Set(
      postingDayValues.map((value) => new Date(value).toISOString())
    )
  ].map((value) => new Date(value));

  if (periodEnd < periodStart) {
    throw new BadRequestException(
      "A data final do calendário deve ser posterior à data inicial."
    );
  }

  if (
    postingDays.some(
      (scheduledDate) =>
        scheduledDate < periodStart || scheduledDate > periodEnd
    )
  ) {
    throw new BadRequestException(
      "Todos os dias de postagem devem pertencer ao período do calendário."
    );
  }

  return {
    periodStart,
    periodEnd,
    postingDays
  };
}

const clientInclude = {
  credential: {
    select: {
      email: true
    }
  },
  assignedDesigner: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true
    }
  },
  calendars: {
    orderBy: {
      periodStart: "desc" as const
    },
    include: {
      postingDays: {
        orderBy: {
          scheduledDate: "asc" as const
        }
      },
      contentItems: {
        orderBy: [
          { scheduledAt: "asc" as const },
          { sortOrder: "asc" as const }
        ],
        include: {
          formatPreset: true,
          assets: {
            orderBy: {
              sortOrder: "asc" as const
            }
          }
        }
      }
    }
  }
};

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nextcloud: NextcloudService
  ) {}

  dashboard(actor: InternalActor) {
    return this.prisma.client.findMany({
      where:
        actor.role === UserRole.DESIGNER
          ? { assignedDesignerId: actor.id }
          : undefined,
      orderBy: { createdAt: "desc" },
      include: clientInclude
    });
  }

  listDesigners(actor: InternalActor) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);

    return this.prisma.designer.findMany({
      where: {
        role: UserRole.DESIGNER,
        active: true
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        _count: {
          select: {
            clients: true
          }
        }
      }
    });
  }

  listUsers(actor: InternalActor) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);

    return this.prisma.designer.findMany({
      where:
        actor.role === UserRole.ADMIN
          ? {
              role: {
                not: UserRole.DEV
              }
            }
          : undefined,
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        _count: {
          select: {
            clients: true
          }
        }
      }
    });
  }

  listFormats(_actor: InternalActor) {
    return this.prisma.contentFormat.findMany({
      orderBy: [
        { active: "desc" },
        { contentType: "asc" },
        { name: "asc" }
      ]
    });
  }

  async getClient(actor: InternalActor, id: string) {
    const client = await this.prisma.client.findFirst({
      where: {
        id,
        ...(actor.role === UserRole.DESIGNER
          ? { assignedDesignerId: actor.id }
          : {})
      },
      include: clientInclude
    });

    if (!client) {
      throw new NotFoundException("Cliente não encontrado.");
    }

    return client;
  }

  async getCalendar(actor: InternalActor, id: string) {
    const calendar = await this.prisma.calendar.findFirst({
      where: {
        id,
        ...(actor.role === UserRole.DESIGNER
          ? {
              client: {
                assignedDesignerId: actor.id
              }
            }
          : {})
      },
      include: {
        client: {
          include: {
            credential: {
              select: {
                email: true
              }
            },
            assignedDesigner: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        },
        contentItems: {
          orderBy: [{ scheduledAt: "asc" }, { sortOrder: "asc" }],
          include: {
            formatPreset: true,
            assets: {
              orderBy: {
                sortOrder: "asc"
              }
            },
            reviews: {
              orderBy: { createdAt: "desc" },
              take: 1
            }
          }
        },
        postingDays: {
          orderBy: { scheduledDate: "asc" }
        }
      }
    });

    if (!calendar) {
      throw new NotFoundException("Calendário não encontrado.");
    }

    return calendar;
  }

  async createDesigner(actor: InternalActor, dto: CreateDesignerDto) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);
    return this.createUser(actor, { ...dto, role: UserRole.DESIGNER });
  }

  async createUser(actor: InternalActor, dto: CreateDesignerDto) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);

    const targetRole = dto.role ?? UserRole.DESIGNER;
    this.assertCanManageRole(actor, targetRole);

    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.designer.findUnique({
      where: { email }
    });

    if (existing) {
      throw new BadRequestException("Já existe um usuário com esse e-mail.");
    }

    return this.prisma.designer.create({
      data: {
        name: dto.name.trim(),
        email,
        passwordHash: hashPassword(dto.password),
        role: targetRole,
        mustChangePassword: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true
      }
    });
  }

  async updateUser(
    actor: InternalActor,
    id: string,
    dto: UpdateUserDto
  ) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);

    const current = await this.prisma.designer.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        _count: { select: { clients: true } }
      }
    });

    if (!current) {
      throw new NotFoundException("Usuário não encontrado.");
    }

    this.assertCanEditUser(actor, current.role);
    this.assertCanManageRole(actor, dto.role);

    if (
      current.role === UserRole.DESIGNER &&
      dto.role !== UserRole.DESIGNER &&
      current._count.clients > 0
    ) {
      throw new BadRequestException(
        "Reatribua os clientes deste designer antes de alterar o perfil."
      );
    }

    if (current.role === UserRole.DEV && dto.role !== UserRole.DEV) {
      const devCount = await this.prisma.designer.count({
        where: {
          role: UserRole.DEV,
          active: true
        }
      });

      if (devCount <= 1) {
        throw new BadRequestException(
          "O sistema precisa manter pelo menos um usuário dev."
        );
      }
    }

    const email = dto.email.trim().toLowerCase();
    const emailOwner = await this.prisma.designer.findUnique({
      where: { email },
      select: {
        id: true,
        active: true
      }
    });

    if (emailOwner && emailOwner.id !== id) {
      throw new BadRequestException("Já existe um usuário com esse e-mail.");
    }

    const password = dto.password?.trim();
    const updated = await this.prisma.designer.update({
      where: { id },
      data: {
        name: dto.name.trim(),
        email,
        role: dto.role,
        ...(password
          ? {
              passwordHash: hashPassword(password),
              mustChangePassword: true
            }
          : {})
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true
      }
    });

    if (password) {
      await this.prisma.designerSession.deleteMany({
        where: { designerId: id }
      });
    }

    return updated;
  }

  async setUserActive(
    actor: InternalActor,
    id: string,
    active: boolean
  ) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);

    const current = await this.prisma.designer.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        active: true
      }
    });

    if (!current) {
      throw new NotFoundException("Usuário não encontrado.");
    }

    this.assertCanEditUser(actor, current.role);

    if (!active && current.id === actor.id) {
      throw new BadRequestException(
        "Você não pode inativar o próprio usuário."
      );
    }

    if (!active && current.role === UserRole.DEV) {
      const activeDevCount = await this.prisma.designer.count({
        where: {
          role: UserRole.DEV,
          active: true
        }
      });

      if (activeDevCount <= 1) {
        throw new BadRequestException(
          "O sistema precisa manter pelo menos um usuário dev ativo."
        );
      }
    }

    const updated = await this.prisma.designer.update({
      where: { id },
      data: { active },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true
      }
    });

    if (!active) {
      await this.prisma.designerSession.deleteMany({
        where: { designerId: id }
      });
    }

    return updated;
  }

  async setClientActive(
    actor: InternalActor,
    id: string,
    active: boolean
  ) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);

    const client = await this.prisma.client.findUnique({
      where: { id },
      select: {
        id: true,
        active: true
      }
    });

    if (!client) {
      throw new NotFoundException("Cliente não encontrado.");
    }

    const updated = await this.prisma.client.update({
      where: { id },
      data: { active },
      include: clientInclude
    });

    if (!active) {
      await this.prisma.clientSession.deleteMany({
        where: { clientId: id }
      });
    }

    return updated;
  }

  async createFormat(
    actor: InternalActor,
    dto: CreateContentFormatDto
  ) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);
    this.ensureFormatPlacement(dto.supportsFeed, dto.supportsStories);
    await this.ensureFormatNameAvailable(dto.name);

    return this.prisma.contentFormat.create({
      data: {
        name: dto.name.trim(),
        contentType: dto.contentType,
        width: dto.width,
        height: dto.height,
        supportsFeed: dto.supportsFeed,
        supportsStories: dto.supportsStories,
        active: dto.active ?? true
      }
    });
  }

  async updateFormat(
    actor: InternalActor,
    id: string,
    dto: UpdateContentFormatDto
  ) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);
    this.ensureFormatPlacement(dto.supportsFeed, dto.supportsStories);

    const existing = await this.prisma.contentFormat.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existing) {
      throw new NotFoundException("Formato não encontrado.");
    }

    await this.ensureFormatNameAvailable(dto.name, id);

    return this.prisma.contentFormat.update({
      where: { id },
      data: {
        name: dto.name.trim(),
        contentType: dto.contentType,
        width: dto.width,
        height: dto.height,
        supportsFeed: dto.supportsFeed,
        supportsStories: dto.supportsStories,
        active: dto.active
      }
    });
  }

  async createClient(actor: InternalActor, dto: CreateClientDto) {
    const baseSlug = (dto.slug || dto.name)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    if (!baseSlug) {
      throw new BadRequestException(
        "Não foi possível gerar um slug para o cliente."
      );
    }

    let assignedDesignerId = dto.assignedDesignerId || null;

    if (actor.role === UserRole.DESIGNER) {
      assignedDesignerId = actor.id;
    } else if (assignedDesignerId) {
      await this.ensureDesigner(assignedDesignerId);
    }

    const loginEmail = dto.email.trim().toLowerCase();
    const emailOwner = await this.prisma.clientCredential.findUnique({
      where: { email: loginEmail },
      select: { id: true }
    });

    if (emailOwner) {
      throw new BadRequestException(
        "Já existe um cliente com esse e-mail de acesso."
      );
    }

    const existing = await this.prisma.client.findUnique({
      where: { slug: baseSlug }
    });

    const slug = existing
      ? `${baseSlug}-${randomBytes(2).toString("hex")}`
      : baseSlug;

    return this.prisma.client.create({
      data: {
        name: dto.name.trim(),
        slug,
        niche: dto.niche.trim(),
        phone: dto.phone.trim(),
        nextcloudPath: normalizeNextcloudPath(dto.nextcloudPath),
        assignedDesignerId,
        credential: {
          create: {
            email: loginEmail,
            passwordHash: hashPassword(dto.password)
          }
        }
      },
      include: clientInclude
    });
  }

  async updateClient(
    actor: InternalActor,
    id: string,
    dto: UpdateClientDto
  ) {
    await this.assertClientAccess(actor, id);

    const current = await this.prisma.client.findUnique({
      where: { id },
      include: {
        credential: true
      }
    });

    if (!current) {
      throw new NotFoundException("Cliente não encontrado.");
    }

    const loginEmail = dto.email.trim().toLowerCase();
    const emailOwner = await this.prisma.clientCredential.findUnique({
      where: { email: loginEmail },
      select: {
        clientId: true
      }
    });

    if (emailOwner && emailOwner.clientId !== id) {
      throw new BadRequestException(
        "Já existe um cliente com esse e-mail de acesso."
      );
    }

    const password = dto.password?.trim();

    if (!current.credential && !password) {
      throw new BadRequestException(
        "Defina uma senha para ativar o acesso deste cliente."
      );
    }

    const updated = await this.prisma.client.update({
      where: { id },
      data: {
        name: dto.name.trim(),
        niche: dto.niche.trim(),
        phone: dto.phone.trim(),
        ...(dto.nextcloudPath !== undefined
          ? { nextcloudPath: normalizeNextcloudPath(dto.nextcloudPath) }
          : {}),
        credential: current.credential
          ? {
              update: {
                email: loginEmail,
                ...(password
                  ? { passwordHash: hashPassword(password) }
                  : {})
              }
            }
          : {
              create: {
                email: loginEmail,
                passwordHash: hashPassword(password!)
              }
            }
      },
      include: clientInclude
    });

    if (password) {
      await this.prisma.clientSession.deleteMany({
        where: {
          clientId: id
        }
      });
    }

    return updated;
  }

  async assignClient(
    actor: InternalActor,
    clientId: string,
    dto: AssignClientDto
  ) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);

    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true }
    });

    if (!client) {
      throw new NotFoundException("Cliente não encontrado.");
    }

    if (dto.designerId) {
      await this.ensureDesigner(dto.designerId);
    }

    return this.prisma.client.update({
      where: { id: clientId },
      data: {
        assignedDesignerId: dto.designerId || null
      },
      include: clientInclude
    });
  }

  async createCalendar(actor: InternalActor, dto: CreateCalendarDto) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);
    const client = await this.assertClientAccess(actor, dto.clientId);

    if (!client.active) {
      throw new BadRequestException(
        "Reative o cliente antes de criar um calendário."
      );
    }
    const dates = parseCalendarDates(
      dto.periodStart,
      dto.periodEnd,
      dto.postingDays
    );

    return this.prisma.calendar.create({
      data: {
        clientId: dto.clientId,
        title: dto.title.trim(),
        periodStart: dates.periodStart,
        periodEnd: dates.periodEnd,
        shareToken: randomBytes(24).toString("hex"),
        postingDays: {
          create: dates.postingDays.map((scheduledDate) => ({
            scheduledDate
          }))
        }
      },
      include: {
        postingDays: {
          orderBy: { scheduledDate: "asc" }
        }
      }
    });
  }

  async updateCalendar(
    actor: InternalActor,
    calendarId: string,
    dto: UpdateCalendarDto
  ) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);
    const calendar = await this.assertCalendarAccess(actor, calendarId);

    if (!calendar.client.active) {
      throw new BadRequestException(
        "Reative o cliente antes de editar o calendário."
      );
    }

    if (calendar.archivedAt) {
      throw new BadRequestException(
        "Restaure o calendário antes de editá-lo."
      );
    }

    if (
      !([CalendarStage.PLANNING, CalendarStage.PRE_APPROVAL] as CalendarStage[]).includes(
        calendar.stage
      )
    ) {
      throw new BadRequestException(
        "O calendário só pode ter período e dias alterados antes do início da produção."
      );
    }

    const dates = parseCalendarDates(
      dto.periodStart,
      dto.periodEnd,
      dto.postingDays
    );
    const selectedDateKeys = new Set(
      dates.postingDays.map((day) => dateKey(day))
    );
    const usedDateKeys = calendar.contentItems.map((item) =>
      saoPauloDateKey(item.scheduledAt)
    );
    const removedUsedDate = usedDateKeys.find(
      (value) => !selectedDateKeys.has(value)
    );

    if (removedUsedDate) {
      throw new BadRequestException(
        "Não é possível remover um dia que já possui conteúdo. Ajuste a peça antes de alterar o planejamento."
      );
    }

    await this.prisma.$transaction([
      this.prisma.calendar.update({
        where: { id: calendarId },
        data: {
          title: dto.title.trim(),
          periodStart: dates.periodStart,
          periodEnd: dates.periodEnd
        }
      }),
      this.prisma.calendarPostingDay.deleteMany({
        where: { calendarId }
      }),
      this.prisma.calendarPostingDay.createMany({
        data: dates.postingDays.map((scheduledDate) => ({
          calendarId,
          scheduledDate
        }))
      })
    ]);

    return this.getCalendar(actor, calendarId);
  }

  async archiveCalendar(actor: InternalActor, calendarId: string) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);
    const calendar = await this.assertCalendarAccess(actor, calendarId);

    if (calendar.archivedAt) {
      return calendar;
    }

    return this.prisma.calendar.update({
      where: { id: calendarId },
      data: {
        archivedAt: new Date(),
        stage: CalendarStage.ARCHIVED
      }
    });
  }

  async restoreCalendar(actor: InternalActor, calendarId: string) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);
    const calendar = await this.assertCalendarAccess(actor, calendarId);
    const stage = this.inferCalendarStage(calendar.contentItems);

    return this.prisma.calendar.update({
      where: { id: calendarId },
      data: {
        archivedAt: null,
        stage
      }
    });
  }

  async createPlanningItem(
    actor: InternalActor,
    calendarId: string,
    dto: CreatePlanningItemDto
  ) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);
    const calendar = await this.assertCalendarAccess(actor, calendarId);

    if (!calendar.client.active || calendar.archivedAt) {
      throw new BadRequestException(
        "O cliente e o calendário precisam estar ativos para criar o planejamento."
      );
    }

    if (calendar.stage !== CalendarStage.PLANNING) {
      throw new BadRequestException(
        "Novas peças só podem ser adicionadas enquanto o pré-calendário está em planejamento."
      );
    }

    const scheduledAt = this.validatePlanningSchedule(
      calendar,
      dto.postingDate,
      dto.scheduledAt
    );

    this.ensurePlacement(dto.publishToFeed, dto.publishToStories);

    return this.prisma.contentItem.create({
      data: {
        calendarId,
        title: dto.title.trim(),
        theme: dto.theme.trim(),
        headline: dto.headline.trim(),
        subheadline: dto.subheadline?.trim() || null,
        designerNotes: dto.designerNotes?.trim() || null,
        scheduledAt,
        channel: dto.channel ?? Channel.INSTAGRAM,
        contentType: dto.contentType,
        format: "A definir na produção",
        publishToFeed: dto.publishToFeed,
        publishToStories: dto.publishToStories,
        caption: dto.caption.trim(),
        status: ContentStatus.DRAFT,
        stage: ContentStage.PLANNING
      }
    });
  }

  async updatePlanningItem(
    actor: InternalActor,
    contentItemId: string,
    dto: UpdatePlanningItemDto
  ) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);

    const item = await this.prisma.contentItem.findUnique({
      where: { id: contentItemId },
      select: {
        id: true,
        calendarId: true,
        stage: true
      }
    });

    if (!item) {
      throw new NotFoundException("Conteúdo não encontrado.");
    }

    const calendar = await this.assertCalendarAccess(actor, item.calendarId);

    if (
      !([CalendarStage.PLANNING, CalendarStage.PRE_APPROVAL] as CalendarStage[]).includes(
        calendar.stage
      )
    ) {
      throw new BadRequestException(
        "O briefing não pode ser alterado depois que a produção das artes começou."
      );
    }

    const scheduledAt = this.validatePlanningSchedule(
      calendar,
      dto.postingDate,
      dto.scheduledAt,
      contentItemId
    );

    this.ensurePlacement(dto.publishToFeed, dto.publishToStories);

    return this.prisma.contentItem.update({
      where: { id: contentItemId },
      data: {
        title: dto.title.trim(),
        theme: dto.theme.trim(),
        headline: dto.headline.trim(),
        subheadline: dto.subheadline?.trim() || null,
        designerNotes: dto.designerNotes?.trim() || null,
        scheduledAt,
        channel: dto.channel ?? Channel.INSTAGRAM,
        contentType: dto.contentType,
        publishToFeed: dto.publishToFeed,
        publishToStories: dto.publishToStories,
        caption: dto.caption.trim(),
        stage:
          calendar.stage === CalendarStage.PRE_APPROVAL
            ? ContentStage.PRE_APPROVAL_PENDING
            : ContentStage.PLANNING,
        status:
          calendar.stage === CalendarStage.PRE_APPROVAL
            ? ContentStatus.PENDING_APPROVAL
            : ContentStatus.DRAFT,
        planningApprovedAt: null,
        reviewedAt: null
      }
    });
  }

  async submitPlanning(actor: InternalActor, calendarId: string) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);
    const calendar = await this.assertCalendarAccess(actor, calendarId);

    if (!calendar.client.active || calendar.archivedAt) {
      throw new BadRequestException(
        "O cliente e o calendário precisam estar ativos para enviar o pré-calendário."
      );
    }

    if (
      !([CalendarStage.PLANNING, CalendarStage.PRE_APPROVAL] as CalendarStage[]).includes(
        calendar.stage
      )
    ) {
      throw new BadRequestException(
        "Este calendário já avançou para a etapa de produção."
      );
    }

    if (calendar.contentItems.length === 0) {
      throw new BadRequestException(
        "Adicione pelo menos uma publicação antes de enviar o pré-calendário."
      );
    }

    await this.prisma.$transaction([
      this.prisma.calendar.update({
        where: { id: calendarId },
        data: { stage: CalendarStage.PRE_APPROVAL }
      }),
      this.prisma.contentItem.updateMany({
        where: {
          calendarId,
          stage: {
            in: [
              ContentStage.PLANNING,
              ContentStage.PRE_APPROVAL_PENDING,
              ContentStage.PRE_CHANGES_REQUESTED
            ]
          }
        },
        data: {
          stage: ContentStage.PRE_APPROVAL_PENDING,
          status: ContentStatus.PENDING_APPROVAL,
          reviewedAt: null
        }
      })
    ]);

    return this.getCalendar(actor, calendarId);
  }

  async attachArtwork(
    actor: InternalActor,
    contentItemId: string,
    dto: AttachArtworkDto
  ) {
    const item = await this.prisma.contentItem.findUnique({
      where: { id: contentItemId },
      select: {
        id: true,
        calendarId: true,
        contentType: true,
        publishToFeed: true,
        publishToStories: true,
        stage: true
      }
    });

    if (!item) {
      throw new NotFoundException("Conteúdo não encontrado.");
    }

    const calendar = await this.assertCalendarAccess(actor, item.calendarId);

    if (!calendar.client.active || calendar.archivedAt) {
      throw new BadRequestException(
        "O cliente e o calendário precisam estar ativos para produzir a arte."
      );
    }

    if (calendar.stage !== CalendarStage.PRODUCTION) {
      throw new BadRequestException(
        "As artes só podem ser anexadas depois da aprovação do pré-calendário."
      );
    }

    if (
      !([
        ContentStage.DESIGN_PENDING,
        ContentStage.DESIGN_IN_PROGRESS,
        ContentStage.ART_CHANGES_REQUESTED
      ] as ContentStage[]).includes(item.stage)
    ) {
      throw new BadRequestException(
        "Esta peça não está disponível para produção de arte."
      );
    }

    if (item.contentType !== ContentType.CAROUSEL && dto.assetPaths.length > 1) {
      throw new BadRequestException(
        "Apenas carrosséis aceitam mais de uma mídia."
      );
    }

    const format = await this.prisma.contentFormat.findFirst({
      where: {
        id: dto.formatId,
        active: true
      }
    });

    if (!format || format.contentType !== item.contentType) {
      throw new BadRequestException(
        "Selecione um formato ativo compatível com o tipo da peça."
      );
    }

    if (
      (item.publishToFeed && !format.supportsFeed) ||
      (item.publishToStories && !format.supportsStories)
    ) {
      throw new BadRequestException(
        "O formato selecionado não suporta os destinos aprovados no planejamento."
      );
    }

    const assets = await Promise.all(
      dto.assetPaths.map((path) =>
        this.nextcloud.getMetadata(
          calendar.client.nextcloudPath || `/${calendar.client.slug}`,
          path
        )
      )
    );

    if (
      assets.some(
        (asset) =>
          !asset.mimeType ||
          (!asset.mimeType.startsWith("image/") &&
            !asset.mimeType.startsWith("video/"))
      )
    ) {
      throw new BadRequestException(
        "Selecione apenas imagens ou vídeos do Nextcloud."
      );
    }

    await this.prisma.$transaction([
      this.prisma.contentAsset.deleteMany({
        where: { contentItemId }
      }),
      this.prisma.contentItem.update({
        where: { id: contentItemId },
        data: {
          formatId: format.id,
          format: `${format.name} · ${format.width}x${format.height}`,
          stage: ContentStage.DESIGN_IN_PROGRESS,
          status: ContentStatus.DRAFT,
          artworkApprovedAt: null,
          reviewedAt: null,
          assets: {
            create: assets.map((asset, index) => ({
              filePath: asset.storedPath,
              fileName: asset.name,
              fileId: asset.fileId,
              mimeType: asset.mimeType,
              etag: asset.etag,
              sortOrder: index
            }))
          }
        }
      })
    ]);

    return this.getCalendar(actor, item.calendarId);
  }

  async submitArtwork(actor: InternalActor, calendarId: string) {
    const calendar = await this.assertCalendarAccess(actor, calendarId);

    if (!calendar.client.active || calendar.archivedAt) {
      throw new BadRequestException(
        "O cliente e o calendário precisam estar ativos para enviar as artes."
      );
    }

    if (calendar.stage !== CalendarStage.PRODUCTION) {
      throw new BadRequestException(
        "O calendário não está na etapa de produção."
      );
    }

    const items = await this.prisma.contentItem.findMany({
      where: { calendarId },
      include: {
        assets: {
          select: { id: true }
        }
      }
    });

    const withoutArtwork = items.find(
      (item) =>
        item.stage !== ContentStage.ART_APPROVED &&
        item.assets.length === 0
    );

    if (withoutArtwork) {
      throw new BadRequestException(
        `A peça "${withoutArtwork.title}" ainda não possui arte.`
      );
    }

    await this.prisma.$transaction([
      this.prisma.calendar.update({
        where: { id: calendarId },
        data: { stage: CalendarStage.FINAL_APPROVAL }
      }),
      this.prisma.contentItem.updateMany({
        where: {
          calendarId,
          stage: {
            not: ContentStage.ART_APPROVED
          }
        },
        data: {
          stage: ContentStage.ART_APPROVAL_PENDING,
          status: ContentStatus.PENDING_APPROVAL,
          reviewedAt: null
        }
      })
    ]);

    return this.getCalendar(actor, calendarId);
  }

  async markScheduled(
    actor: InternalActor,
    contentItemId: string,
    dto: MarkScheduledDto
  ) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);

    const item = await this.prisma.contentItem.findUnique({
      where: { id: contentItemId },
      select: { id: true, calendarId: true, stage: true }
    });

    if (!item) {
      throw new NotFoundException("Conteúdo não encontrado.");
    }

    if (
      !([
        ContentStage.READY_TO_SCHEDULE,
        ContentStage.SCHEDULING_ERROR
      ] as ContentStage[]).includes(item.stage)
    ) {
      throw new BadRequestException(
        "Somente conteúdos aprovados podem ser marcados como programados."
      );
    }

    const updated = await this.prisma.contentItem.update({
      where: { id: contentItemId },
      data: {
        stage: ContentStage.SCHEDULED,
        externalScheduleId: dto.externalScheduleId?.trim() || null,
        publishingError: null
      }
    });

    await this.syncCalendarPublishingStage(item.calendarId);
    return updated;
  }

  async markPublished(actor: InternalActor, contentItemId: string) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);

    const item = await this.prisma.contentItem.findUnique({
      where: { id: contentItemId },
      select: { id: true, calendarId: true, stage: true }
    });

    if (!item) {
      throw new NotFoundException("Conteúdo não encontrado.");
    }

    if (
      !([
        ContentStage.SCHEDULED,
        ContentStage.READY_TO_SCHEDULE
      ] as ContentStage[]).includes(item.stage)
    ) {
      throw new BadRequestException(
        "Este conteúdo ainda não está pronto para publicação."
      );
    }

    const updated = await this.prisma.contentItem.update({
      where: { id: contentItemId },
      data: {
        stage: ContentStage.PUBLISHED,
        publishedAt: new Date(),
        publishingError: null
      }
    });

    await this.syncCalendarPublishingStage(item.calendarId);
    return updated;
  }

  async markSchedulingError(
    actor: InternalActor,
    contentItemId: string,
    dto: MarkSchedulingErrorDto
  ) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);

    const item = await this.prisma.contentItem.findUnique({
      where: { id: contentItemId },
      select: { id: true, calendarId: true, stage: true }
    });

    if (!item) {
      throw new NotFoundException("Conteúdo não encontrado.");
    }

    if (
      !([
        ContentStage.READY_TO_SCHEDULE,
        ContentStage.SCHEDULED,
        ContentStage.SCHEDULING_ERROR
      ] as ContentStage[]).includes(item.stage)
    ) {
      throw new BadRequestException(
        "Este conteúdo ainda não entrou na fila de programação."
      );
    }

    const updated = await this.prisma.contentItem.update({
      where: { id: contentItemId },
      data: {
        stage: ContentStage.SCHEDULING_ERROR,
        publishingError: dto.message.trim()
      }
    });

    await this.syncCalendarPublishingStage(item.calendarId);
    return updated;
  }

  async createContentItem(
    actor: InternalActor,
    dto: CreateContentItemDto
  ) {
    await this.assertCalendarAccess(actor, dto.calendarId);

    throw new BadRequestException(
      "O cadastro direto de arte foi substituído pelo fluxo de pré-calendário. Crie o briefing, aprove o planejamento e depois anexe a arte na etapa de produção."
    );
  }

  async moveContentItem(
    actor: InternalActor,
    contentItemId: string,
    dto: MoveContentItemDto
  ) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);
    const item = await this.prisma.contentItem.findUnique({
      where: { id: contentItemId },
      select: {
        id: true,
        calendarId: true
      }
    });

    if (!item) {
      throw new NotFoundException("Conteúdo não encontrado.");
    }

    const calendar = await this.assertCalendarAccess(actor, item.calendarId);

    if (!calendar.client.active) {
      throw new BadRequestException(
        "Reative o cliente antes de remanejar conteúdos."
      );
    }

    if (calendar.archivedAt) {
      throw new BadRequestException(
        "Restaure o calendário antes de remanejar conteúdos."
      );
    }

    if (
      !([CalendarStage.PLANNING, CalendarStage.PRE_APPROVAL] as CalendarStage[]).includes(
        calendar.stage
      )
    ) {
      throw new BadRequestException(
        "A data só pode ser remanejada antes do início da produção."
      );
    }

    const postingDay = calendar.postingDays.find(
      (day) => dateKey(day.scheduledDate) === dto.postingDate
    );

    if (!postingDay) {
      throw new BadRequestException(
        "Escolha um dos dias de publicação definidos para este calendário."
      );
    }

    const occupiedItem = calendar.contentItems.find(
      (calendarItem) =>
        calendarItem.id !== contentItemId &&
        saoPauloDateKey(calendarItem.scheduledAt) === dto.postingDate
    );

    if (occupiedItem) {
      throw new BadRequestException(
        "Este dia já possui conteúdo. Escolha outro dia planejado."
      );
    }

    const scheduledAt = new Date(dto.scheduledAt);

    if (
      Number.isNaN(scheduledAt.getTime()) ||
      saoPauloDateKey(scheduledAt) !== dto.postingDate
    ) {
      throw new BadRequestException(
        "A data e o horário precisam corresponder ao dia de publicação selecionado."
      );
    }

    return this.prisma.contentItem.update({
      where: { id: contentItemId },
      data: {
        scheduledAt,
        ...(calendar.stage === CalendarStage.PRE_APPROVAL
          ? {
              stage: ContentStage.PRE_APPROVAL_PENDING,
              status: ContentStatus.PENDING_APPROVAL,
              planningApprovedAt: null,
              reviewedAt: null
            }
          : {})
      },
      include: {
        formatPreset: true,
        assets: {
          orderBy: {
            sortOrder: "asc"
          }
        }
      }
    });
  }

  async rotateCalendarToken(actor: InternalActor, calendarId: string) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);
    const calendar = await this.assertCalendarAccess(actor, calendarId);

    if (!calendar.client.active) {
      throw new BadRequestException(
        "Reative o cliente antes de renovar o link."
      );
    }

    if (calendar.archivedAt) {
      throw new BadRequestException(
        "Restaure o calendário antes de renovar o link."
      );
    }

    return this.prisma.calendar.update({
      where: { id: calendarId },
      data: {
        shareToken: randomBytes(24).toString("hex")
      }
    });
  }

  private async assertClientAccess(actor: InternalActor, clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: {
        id: clientId,
        ...(actor.role === UserRole.DESIGNER
          ? { assignedDesignerId: actor.id }
          : {})
      },
      select: {
        id: true,
        active: true
      }
    });

    if (!client) {
      throw new ForbiddenException("Você não tem acesso a este cliente.");
    }

    return client;
  }

  private async assertCalendarAccess(
    actor: InternalActor,
    calendarId: string
  ) {
    const calendar = await this.prisma.calendar.findFirst({
      where: {
        id: calendarId,
        ...(actor.role === UserRole.DESIGNER
          ? {
              client: {
                assignedDesignerId: actor.id
              }
            }
          : {})
      },
      include: {
        client: {
          select: {
            id: true,
            slug: true,
            nextcloudPath: true,
            active: true
          }
        },
        postingDays: true,
        contentItems: {
          select: {
            id: true,
            scheduledAt: true,
            stage: true
          }
        }
      }
    });

    if (!calendar) {
      throw new ForbiddenException("Você não tem acesso a este calendário.");
    }

    return calendar;
  }

  private validatePlanningSchedule(
    calendar: {
      postingDays: Array<{ scheduledDate: Date }>;
      contentItems: Array<{ id: string; scheduledAt: Date }>;
    },
    postingDate: string,
    scheduledAtValue: string,
    ignoreItemId?: string
  ) {
    const postingDay = calendar.postingDays.find(
      (day) => dateKey(day.scheduledDate) === postingDate
    );

    if (!postingDay) {
      throw new BadRequestException(
        "Escolha um dos dias definidos no calendário."
      );
    }

    const occupied = calendar.contentItems.find(
      (item) =>
        item.id !== ignoreItemId &&
        saoPauloDateKey(item.scheduledAt) === postingDate
    );

    if (occupied) {
      throw new BadRequestException(
        "Este dia já possui uma publicação planejada."
      );
    }

    const scheduledAt = new Date(scheduledAtValue);

    if (
      Number.isNaN(scheduledAt.getTime()) ||
      saoPauloDateKey(scheduledAt) !== postingDate
    ) {
      throw new BadRequestException(
        "A data e o horário precisam corresponder ao dia selecionado."
      );
    }

    return scheduledAt;
  }

  private ensurePlacement(feed: boolean, stories: boolean) {
    if (!feed && !stories) {
      throw new BadRequestException(
        "Selecione Feed, Stories ou ambos."
      );
    }
  }

  private inferCalendarStage(
    items: Array<{ stage: ContentStage }>
  ): CalendarStage {
    if (items.length === 0) {
      return CalendarStage.PLANNING;
    }

    if (items.every((item) => item.stage === ContentStage.PUBLISHED)) {
      return CalendarStage.COMPLETED;
    }

    if (
      items.some((item) =>
        ([
          ContentStage.READY_TO_SCHEDULE,
          ContentStage.SCHEDULED,
          ContentStage.SCHEDULING_ERROR,
          ContentStage.PUBLISHED
        ] as ContentStage[]).includes(item.stage)
      )
    ) {
      return CalendarStage.SCHEDULING;
    }

    if (
      items.some((item) => item.stage === ContentStage.ART_APPROVAL_PENDING)
    ) {
      return CalendarStage.FINAL_APPROVAL;
    }

    if (
      items.some((item) =>
        ([
          ContentStage.DESIGN_PENDING,
          ContentStage.DESIGN_IN_PROGRESS,
          ContentStage.ART_CHANGES_REQUESTED,
          ContentStage.ART_APPROVED
        ] as ContentStage[]).includes(item.stage)
      )
    ) {
      return CalendarStage.PRODUCTION;
    }

    if (
      items.some((item) =>
        ([
          ContentStage.PRE_APPROVAL_PENDING,
          ContentStage.PRE_APPROVED,
          ContentStage.PRE_CHANGES_REQUESTED
        ] as ContentStage[]).includes(item.stage)
      )
    ) {
      return CalendarStage.PRE_APPROVAL;
    }

    return CalendarStage.PLANNING;
  }

  private async syncCalendarPublishingStage(calendarId: string) {
    const items = await this.prisma.contentItem.findMany({
      where: { calendarId },
      select: { stage: true }
    });

    const stage = items.length > 0 &&
      items.every((item) => item.stage === ContentStage.PUBLISHED)
      ? CalendarStage.COMPLETED
      : CalendarStage.SCHEDULING;

    await this.prisma.calendar.update({
      where: { id: calendarId },
      data: { stage }
    });
  }

  private async ensureDesigner(id: string) {
    const designer = await this.prisma.designer.findFirst({
      where: {
        id,
        role: UserRole.DESIGNER,
        active: true
      },
      select: { id: true }
    });

    if (!designer) {
      throw new BadRequestException(
        "O responsável informado não é um designer válido."
      );
    }
  }

  private async ensureFormatNameAvailable(name: string, ignoreId?: string) {
    const existing = await this.prisma.contentFormat.findFirst({
      where: {
        name: name.trim(),
        ...(ignoreId ? { id: { not: ignoreId } } : {})
      },
      select: { id: true }
    });

    if (existing) {
      throw new BadRequestException("Já existe um formato com esse nome.");
    }
  }

  private ensureFormatPlacement(feed: boolean, stories: boolean) {
    if (!feed && !stories) {
      throw new BadRequestException(
        "O formato precisa ser compatível com Feed, Stories ou ambos."
      );
    }
  }

  private assertCanManageRole(actor: InternalActor, role: UserRole) {
    if (actor.role === UserRole.DEV) {
      return;
    }

    if (actor.role === UserRole.ADMIN && role === UserRole.DESIGNER) {
      return;
    }

    throw new ForbiddenException(
      "Você não tem permissão para criar ou atribuir este perfil."
    );
  }

  private assertCanEditUser(actor: InternalActor, role: UserRole) {
    if (actor.role === UserRole.DEV) {
      return;
    }

    if (actor.role === UserRole.ADMIN && role === UserRole.DESIGNER) {
      return;
    }

    throw new ForbiddenException(
      "Você não tem permissão para editar este usuário."
    );
  }

  private requireRoles(actor: InternalActor, ...roles: UserRole[]) {
    if (!roles.includes(actor.role)) {
      throw new ForbiddenException("Você não tem permissão para esta ação.");
    }
  }
}
