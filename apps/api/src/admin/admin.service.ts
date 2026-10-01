import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  ArtworkPriority,
  CalendarStage,
  Channel,
  CommentAuthorType,
  CommemorativeScope,
  ContentStage,
  ContentStatus,
  ContentType,
  NotificationType,
  StandaloneArtworkStatus,
  UserRole
} from "@approve/database";
import { randomBytes, scryptSync } from "node:crypto";
import { sendWorkflowEmail } from "../auth/smtp-mailer";
import type { InternalActor } from "../common/internal-actor";
import { NextcloudService } from "../nextcloud/nextcloud.service";
import { PrismaService } from "../prisma.service";
import {
  AssignClientDto,
  AssignDemandDesignerDto,
  AttachArtworkDto,
  CreateBriefingTemplateDto,
  CreateCalendarDto,
  CreateCommemorativeDateDto,
  CreateContentAnnotationDto,
  CreateContentCommentDto,
  CreateClientDto,
  CreateContentFormatDto,
  CreateContentItemDto,
  CreateDesignerDto,
  CreatePlanningItemDto,
  CreateStandaloneArtworkDto,
  MarkScheduledDto,
  MarkSchedulingErrorDto,
  MoveContentItemDto,
  ResolveContentAnnotationDto,
  UpdateBriefingTemplateDto,
  UpdateCalendarDto,
  UpdateClientDto,
  UpdateCommemorativeDateDto,
  UpdateContentFormatDto,
  UpdateContentMetricsDto,
  UpdatePlanningItemDto,
  UpdateContentProductionStageDto,
  UpdateDemandPlannedDateDto,
  UpdateStandaloneArtworkStatusDto,
  UpdateSystemBrandingDto,
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

function safeNextcloudSegment(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .toLowerCase();

  return normalized || "demanda";
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
  postingWeekdays: {
    orderBy: {
      weekday: "asc" as const
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
            where: {
              active: true
            },
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
          ? {
              OR: [
                { assignedDesignerId: actor.id },
                {
                  calendars: {
                    some: {
                      contentItems: {
                        some: { productionDesignerId: actor.id }
                      }
                    }
                  }
                },
                {
                  standaloneArtworks: {
                    some: { designerId: actor.id }
                  }
                }
              ]
            }
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
        weeklyCapacityPoints: true,
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
        weeklyCapacityPoints: true,
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

  async getSystemBranding(actor: InternalActor) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);

    return (
      (await this.prisma.systemBranding.findUnique({
        where: { id: "default" }
      })) ?? {
        id: "default",
        logoPath: null,
        logoName: null,
        faviconPath: null,
        faviconName: null
      }
    );
  }

  async updateSystemBranding(
    actor: InternalActor,
    dto: UpdateSystemBrandingDto
  ) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);

    const logoPath = dto.logoPath?.trim() || null;
    const faviconPath = dto.faviconPath?.trim() || null;
    let logoName = dto.logoName?.trim() || null;
    let faviconName = dto.faviconName?.trim() || null;

    if (logoPath) {
      const logo = await this.nextcloud.validateSystemImageForActor(
        actor,
        logoPath
      );
      logoName = logo.name;
    }

    if (faviconPath) {
      const favicon = await this.nextcloud.validateSystemImageForActor(
        actor,
        faviconPath
      );
      faviconName = favicon.name;
    }

    const branding = await this.prisma.systemBranding.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        logoPath,
        logoName,
        faviconPath,
        faviconName
      },
      update: {
        logoPath,
        logoName,
        faviconPath,
        faviconName
      }
    });

    await this.createAuditLog(actor, {
      action: "SYSTEM_BRANDING_UPDATED",
      entityType: "SystemBranding",
      entityId: branding.id,
      summary: "Identidade visual do sistema atualizada."
    });

    return branding;
  }


  listCommemorativeDates(actor: InternalActor) {
    return this.prisma.commemorativeDate.findMany({
      where:
        actor.role === UserRole.DESIGNER
          ? {
              OR: [
                { clientId: null },
                {
                  client: {
                    assignedDesignerId: actor.id
                  }
                }
              ]
            }
          : undefined,
      orderBy: [
        { active: "desc" },
        { month: "asc" },
        { day: "asc" },
        { name: "asc" }
      ],
      include: {
        client: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }

  async createCommemorativeDate(
    actor: InternalActor,
    dto: CreateCommemorativeDateDto
  ) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);
    this.validateCommemorativeDate(dto.day, dto.month, dto.year);

    if (dto.clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: dto.clientId },
        select: { id: true }
      });

      if (!client) {
        throw new BadRequestException("Cliente selecionado não existe.");
      }
    }

    return this.prisma.commemorativeDate.create({
      data: {
        name: dto.name.trim(),
        day: dto.day,
        month: dto.month,
        year: dto.year ?? null,
        scope: CommemorativeScope.CUSTOM,
        city: dto.city?.trim() || null,
        state: dto.state?.trim().toUpperCase() || null,
        description: dto.description?.trim() || null,
        tags: dto.tags?.trim() || null,
        clientId: dto.clientId?.trim() || null,
        active: dto.active ?? true
      },
      include: {
        client: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }

  async updateCommemorativeDate(
    actor: InternalActor,
    id: string,
    dto: UpdateCommemorativeDateDto
  ) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);

    const current = await this.prisma.commemorativeDate.findUnique({
      where: { id },
      select: {
        id: true,
        scope: true
      }
    });

    if (!current) {
      throw new NotFoundException("Data comemorativa não encontrada.");
    }

    if (current.scope === CommemorativeScope.NATIONAL) {
      throw new BadRequestException(
        "Datas nacionais do sistema são somente leitura."
      );
    }

    this.validateCommemorativeDate(dto.day, dto.month, dto.year);

    if (dto.clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: dto.clientId },
        select: { id: true }
      });

      if (!client) {
        throw new BadRequestException("Cliente selecionado não existe.");
      }
    }

    return this.prisma.commemorativeDate.update({
      where: { id },
      data: {
        name: dto.name.trim(),
        day: dto.day,
        month: dto.month,
        year: dto.year ?? null,
        city: dto.city?.trim() || null,
        state: dto.state?.trim().toUpperCase() || null,
        description: dto.description?.trim() || null,
        tags: dto.tags?.trim() || null,
        clientId: dto.clientId?.trim() || null,
        active: dto.active ?? true
      },
      include: {
        client: {
          select: {
            id: true,
            name: true
          }
        }
      }
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
              OR: [
                {
                  client: {
                    assignedDesignerId: actor.id
                  }
                },
                {
                  contentItems: {
                    some: { productionDesignerId: actor.id }
                  }
                }
              ]
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
            },
            postingWeekdays: {
              orderBy: {
                weekday: "asc"
              }
            }
          }
        },
        contentItems: {
          orderBy: [{ scheduledAt: "asc" }, { sortOrder: "asc" }],
          include: {
            formatPreset: true,
            assets: {
              where: { active: true },
              orderBy: {
                sortOrder: "asc"
              }
            },
            reviews: {
              orderBy: { createdAt: "desc" },
              take: 4
            },
            comments: {
              orderBy: { createdAt: "asc" },
              include: {
                authorDesigner: {
                  select: {
                    id: true,
                    name: true,
                    role: true
                  }
                }
              }
            },
            annotations: {
              orderBy: { createdAt: "asc" },
              include: {
                authorDesigner: {
                  select: {
                    id: true,
                    name: true,
                    role: true
                  }
                }
              }
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
        weeklyCapacityPoints: dto.weeklyCapacityPoints ?? 30,
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
        ...(dto.weeklyCapacityPoints !== undefined
          ? { weeklyCapacityPoints: dto.weeklyCapacityPoints }
          : {}),
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

    await this.createAuditLog(actor, {
      action: "USER_UPDATED",
      entityType: "Designer",
      entityId: id,
      summary: `Usuário "${updated.name}" atualizado.`
    });

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

    await this.createAuditLog(actor, {
      action: active ? "USER_REACTIVATED" : "USER_DEACTIVATED",
      entityType: "Designer",
      entityId: id,
      summary: `Usuário "${updated.name}" ${active ? "reativado" : "inativado"}.`
    });

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

    const created = await this.prisma.client.create({
      data: {
        name: dto.name.trim(),
        slug,
        niche: dto.niche.trim(),
        phone: dto.phone.trim(),
        nextcloudPath: normalizeNextcloudPath(dto.nextcloudPath),
        assignedDesignerId,
        toneOfVoice: dto.toneOfVoice?.trim() || null,
        targetAudience: dto.targetAudience?.trim() || null,
        region: dto.region?.trim() || null,
        services: dto.services?.trim() || null,
        objectives: dto.objectives?.trim() || null,
        prohibitedTerms: dto.prohibitedTerms?.trim() || null,
        hashtags: dto.hashtags?.trim() || null,
        references: dto.references?.trim() || null,
        mlabsProfileId: dto.mlabsProfileId?.trim() || null,
        monthlyPostLimit: dto.monthlyPostLimit ?? null,
        monthlyCarouselLimit: dto.monthlyCarouselLimit ?? null,
        monthlyReelLimit: dto.monthlyReelLimit ?? null,
        monthlyStoryLimit: dto.monthlyStoryLimit ?? null,
        monthlyStandaloneLimit: dto.monthlyStandaloneLimit ?? null,
        monthlyPointsLimit: dto.monthlyPointsLimit ?? null,
        defaultArtworkSlaHours: dto.defaultArtworkSlaHours ?? 72,
        defaultStandaloneSlaHours: dto.defaultStandaloneSlaHours ?? 48,
        postingWeekdays: {
          create: dto.postingWeekdays.map((weekday) => ({ weekday }))
        },
        credential: {
          create: {
            email: loginEmail,
            passwordHash: hashPassword(dto.password)
          }
        }
      },
      include: clientInclude
    });

    await this.createAuditLog(actor, {
      action: "CLIENT_CREATED",
      entityType: "Client",
      entityId: created.id,
      summary: `Cliente "${created.name}" criado.`
    });

    return created;
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
        toneOfVoice: dto.toneOfVoice?.trim() || null,
        targetAudience: dto.targetAudience?.trim() || null,
        region: dto.region?.trim() || null,
        services: dto.services?.trim() || null,
        objectives: dto.objectives?.trim() || null,
        prohibitedTerms: dto.prohibitedTerms?.trim() || null,
        hashtags: dto.hashtags?.trim() || null,
        references: dto.references?.trim() || null,
        mlabsProfileId: dto.mlabsProfileId?.trim() || null,
        monthlyPostLimit: dto.monthlyPostLimit ?? null,
        monthlyCarouselLimit: dto.monthlyCarouselLimit ?? null,
        monthlyReelLimit: dto.monthlyReelLimit ?? null,
        monthlyStoryLimit: dto.monthlyStoryLimit ?? null,
        monthlyStandaloneLimit: dto.monthlyStandaloneLimit ?? null,
        monthlyPointsLimit: dto.monthlyPointsLimit ?? null,
        defaultArtworkSlaHours: dto.defaultArtworkSlaHours ?? current.defaultArtworkSlaHours,
        defaultStandaloneSlaHours: dto.defaultStandaloneSlaHours ?? current.defaultStandaloneSlaHours,
        ...(dto.nextcloudPath !== undefined
          ? { nextcloudPath: normalizeNextcloudPath(dto.nextcloudPath) }
          : {}),
        postingWeekdays: {
          deleteMany: {},
          create: dto.postingWeekdays.map((weekday) => ({ weekday }))
        },
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

    await this.createAuditLog(actor, {
      action: "CLIENT_UPDATED",
      entityType: "Client",
      entityId: id,
      summary: `Cliente "${updated.name}" atualizado.`
    });

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

    const calendar = await this.prisma.calendar.create({
      data: {
        clientId: dto.clientId,
        title: dto.title.trim(),
        periodStart: dates.periodStart,
        periodEnd: dates.periodEnd,
        shareToken: randomBytes(24).toString("hex"),
        planningDueAt: this.optionalDate(dto.planningDueAt),
        planningApprovalDueAt: this.optionalDate(dto.planningApprovalDueAt),
        artworkDueAt: this.optionalDate(dto.artworkDueAt),
        artworkApprovalDueAt: this.optionalDate(dto.artworkApprovalDueAt),
        schedulingDueAt: this.optionalDate(dto.schedulingDueAt),
        shareExpiresAt: this.optionalDate(dto.shareExpiresAt),
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

    if (dto.generateSkeleton !== false) {
      await this.generatePlanningSkeleton(
        calendar.id,
        dto.clientId,
        dates.postingDays
      );
    }

    await this.createAuditLog(actor, {
      action: "CALENDAR_CREATED",
      entityType: "Calendar",
      entityId: calendar.id,
      summary: `Calendário "${calendar.title}" criado.`
    });

    return this.getCalendar(actor, calendar.id);
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
    const existingPostingKeys = new Set(
      calendar.postingDays.map((day) => dateKey(day.scheduledDate))
    );
    const moveMap = new Map<string, string>();

    for (const move of dto.postingDayMoves ?? []) {
      const from = move?.from?.trim();
      const to = move?.to?.trim();

      if (
        !from ||
        !to ||
        !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(to)
      ) {
        throw new BadRequestException("Remanejamento de dia inválido.");
      }

      if (!existingPostingKeys.has(from)) {
        throw new BadRequestException(
          "O dia de origem do remanejamento não pertence ao calendário atual."
        );
      }

      if (!selectedDateKeys.has(to)) {
        throw new BadRequestException(
          "O novo dia precisa estar entre os dias de publicação selecionados."
        );
      }

      if (from !== to) {
        moveMap.set(from, to);
      }
    }

    const usedDateKeys = calendar.contentItems.map((item) =>
      saoPauloDateKey(item.scheduledAt)
    );
    const removedUsedDate = usedDateKeys.find(
      (value) => !selectedDateKeys.has(value) && !moveMap.has(value)
    );

    if (removedUsedDate) {
      throw new BadRequestException(
        "Este dia possui conteúdo. Arraste-o para outra data antes de remover."
      );
    }

    const contentMoveOperations = calendar.contentItems
      .filter((item) => moveMap.has(saoPauloDateKey(item.scheduledAt)))
      .map((item) => {
        const targetDate = moveMap.get(saoPauloDateKey(item.scheduledAt))!;
        const timeParts = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Sao_Paulo",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hourCycle: "h23"
        }).formatToParts(item.scheduledAt);
        const hour = timeParts.find((part) => part.type === "hour")?.value ?? "12";
        const minute = timeParts.find((part) => part.type === "minute")?.value ?? "00";
        const second = timeParts.find((part) => part.type === "second")?.value ?? "00";
        const scheduledAt = new Date(
          `${targetDate}T${hour}:${minute}:${second}-03:00`
        );

        return this.prisma.contentItem.update({
          where: { id: item.id },
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
          }
        });
      });

    await this.prisma.$transaction([
      this.prisma.calendar.update({
        where: { id: calendarId },
        data: {
          title: dto.title.trim(),
          periodStart: dates.periodStart,
          periodEnd: dates.periodEnd,
          planningDueAt: this.optionalDate(dto.planningDueAt),
          planningApprovalDueAt: this.optionalDate(dto.planningApprovalDueAt),
          artworkDueAt: this.optionalDate(dto.artworkDueAt),
          artworkApprovalDueAt: this.optionalDate(dto.artworkApprovalDueAt),
          schedulingDueAt: this.optionalDate(dto.schedulingDueAt),
          shareExpiresAt: this.optionalDate(dto.shareExpiresAt)
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
      }),
      ...contentMoveOperations
    ]);

    await this.createAuditLog(actor, {
      action: "CALENDAR_UPDATED",
      entityType: "Calendar",
      entityId: calendarId,
      summary: `Calendário "${dto.title.trim()}" atualizado.`
    });

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
        effortPoints: this.effortPointsForType(dto.contentType),
        format: "A definir na produção",
        publishToFeed: dto.publishToFeed,
        publishToStories: dto.publishToStories,
        caption: dto.caption.trim(),
        status: ContentStatus.DRAFT,
        stage: ContentStage.PLANNING,
        planningReady: true
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
        stage: true,
        productionDesignerId: true
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
        effortPoints: this.effortPointsForType(dto.contentType),
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
        reviewedAt: null,
        planningReady: true
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

    const unfinished = await this.prisma.contentItem.findFirst({
      where: {
        calendarId,
        planningReady: false
      },
      select: { title: true }
    });

    if (unfinished) {
      throw new BadRequestException(
        `Finalize o briefing de "${unfinished.title}" antes de enviar o pré-calendário.`
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

    await sendWorkflowEmail({
      to: calendar.client.credential?.email,
      subject: `Pré-calendário para aprovação · ${calendar.title}`,
      lines: [
        `Olá, ${calendar.client.name}.`,
        "",
        `O pré-calendário "${calendar.title}" está disponível para aprovação.`,
        "Acesse o link enviado pela equipe da Terceiro Andar para revisar tema, headline, legenda e datas.",
        "",
        "Terceiro Andar · Aprovação"
      ]
    });

    await this.createAuditLog(actor, {
      action: "PLANNING_SENT",
      entityType: "Calendar",
      entityId: calendarId,
      summary: `Pré-calendário "${calendar.title}" enviado para aprovação.`
    });

    return this.getCalendar(actor, calendarId);
  }

  async updateContentPlannedProductionDate(
    actor: InternalActor,
    contentItemId: string,
    dto: UpdateDemandPlannedDateDto
  ) {
    const item = await this.prisma.contentItem.findUnique({
      where: { id: contentItemId },
      select: {
        id: true,
        title: true,
        calendarId: true,
        stage: true,
        productionDesignerId: true
      }
    });

    if (!item) {
      throw new NotFoundException("Conteúdo não encontrado.");
    }

    await this.assertCalendarAccess(actor, item.calendarId, item.id);

    if (
      ([
        ContentStage.ART_APPROVED,
        ContentStage.READY_TO_SCHEDULE,
        ContentStage.SCHEDULED,
        ContentStage.PUBLISHED
      ] as ContentStage[]).includes(item.stage)
    ) {
      throw new BadRequestException(
        "Uma demanda concluída não pode receber novo planejamento de produção."
      );
    }

    const plannedProductionDate = new Date(dto.plannedProductionDate);

    if (Number.isNaN(plannedProductionDate.getTime())) {
      throw new BadRequestException("Data planejada inválida.");
    }

    const weekday = plannedProductionDate.getUTCDay();
    if (weekday === 0 || weekday === 6) {
      throw new BadRequestException(
        "Planeje a produção em um dia útil."
      );
    }

    const updated = await this.prisma.contentItem.update({
      where: { id: contentItemId },
      data: { plannedProductionDate },
      select: {
        id: true,
        title: true,
        plannedProductionDate: true,
        productionDesignerId: true
      }
    });

    await this.createAuditLog(actor, {
      action: "CONTENT_PRODUCTION_DATE_PLANNED",
      entityType: "ContentItem",
      entityId: contentItemId,
      summary: `Peça "${updated.title}" planejada para ${plannedProductionDate
        .toISOString()
        .slice(0, 10)}.`
    });

    return updated;
  }

  async updateStandalonePlannedProductionDate(
    actor: InternalActor,
    id: string,
    dto: UpdateDemandPlannedDateDto
  ) {
    const artwork = await this.prisma.standaloneArtwork.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        designerId: true,
        status: true
      }
    });

    if (!artwork) {
      throw new NotFoundException("Arte avulsa não encontrada.");
    }

    if (
      actor.role === UserRole.DESIGNER &&
      artwork.designerId !== actor.id
    ) {
      throw new ForbiddenException("Esta demanda não está atribuída a você.");
    }

    if (
      ([
        StandaloneArtworkStatus.DELIVERED,
        StandaloneArtworkStatus.CANCELLED
      ] as StandaloneArtworkStatus[]).includes(artwork.status)
    ) {
      throw new BadRequestException(
        "Uma demanda concluída ou cancelada não pode ser replanejada."
      );
    }

    const plannedProductionDate = new Date(dto.plannedProductionDate);

    if (Number.isNaN(plannedProductionDate.getTime())) {
      throw new BadRequestException("Data planejada inválida.");
    }

    const weekday = plannedProductionDate.getUTCDay();
    if (weekday === 0 || weekday === 6) {
      throw new BadRequestException(
        "Planeje a produção em um dia útil."
      );
    }

    const updated = await this.prisma.standaloneArtwork.update({
      where: { id },
      data: { plannedProductionDate },
      include: {
        client: { select: { id: true, name: true, nextcloudPath: true } },
        designer: { select: { id: true, name: true, email: true } },
        outputs: { orderBy: { sortOrder: "asc" } }
      }
    });

    await this.createAuditLog(actor, {
      action: "STANDALONE_PRODUCTION_DATE_PLANNED",
      entityType: "StandaloneArtwork",
      entityId: id,
      summary: `Arte avulsa "${updated.title}" planejada para ${plannedProductionDate
        .toISOString()
        .slice(0, 10)}.`
    });

    return updated;
  }

  async assignContentDemandDesigner(
    actor: InternalActor,
    contentItemId: string,
    dto: AssignDemandDesignerDto
  ) {
    const item = await this.prisma.contentItem.findUnique({
      where: { id: contentItemId },
      select: {
        id: true,
        title: true,
        calendarId: true,
        productionDesignerId: true
      }
    });

    if (!item) {
      throw new NotFoundException("Conteúdo não encontrado.");
    }

    const calendar = await this.assertCalendarAccess(actor, item.calendarId, item.id);

    if (!calendar.client.active || calendar.archivedAt) {
      throw new BadRequestException(
        "O cliente e o calendário precisam estar ativos para atribuir a demanda."
      );
    }

    const designerId =
      actor.role === UserRole.DESIGNER ? actor.id : dto.designerId;

    const target = await this.prisma.designer.findFirst({
      where: {
        id: designerId,
        role: UserRole.DESIGNER,
        active: true
      },
      select: { id: true, name: true, email: true }
    });

    if (!target) {
      throw new BadRequestException("Selecione um designer ativo.");
    }

    const updated = await this.prisma.contentItem.update({
      where: { id: contentItemId },
      data: { productionDesignerId: target.id },
      select: {
        id: true,
        title: true,
        productionDesignerId: true,
        stage: true
      }
    });

    await this.prisma.notification.create({
      data: {
        designerId: target.id,
        type: NotificationType.ACTION,
        title: "Nova demanda atribuída",
        message: `Você foi definido como responsável por "${updated.title}".`,
        link: `/calendars/${item.calendarId}/content/${contentItemId}/artwork`
      }
    });

    await this.createAuditLog(actor, {
      action: "CONTENT_DESIGNER_ASSIGNED",
      entityType: "ContentItem",
      entityId: contentItemId,
      summary: `Peça "${updated.title}" atribuída a ${target.name}.`
    });

    return {
      ...updated,
      designer: target
    };
  }

  async assignStandaloneArtworkDesigner(
    actor: InternalActor,
    id: string,
    dto: AssignDemandDesignerDto
  ) {
    const artwork = await this.prisma.standaloneArtwork.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        designerId: true,
        clientId: true,
        status: true
      }
    });

    if (!artwork) {
      throw new NotFoundException("Arte avulsa não encontrada.");
    }

    if (
      actor.role === UserRole.DESIGNER &&
      artwork.designerId !== actor.id
    ) {
      throw new ForbiddenException("Esta demanda não está atribuída a você.");
    }

    if (artwork.status === StandaloneArtworkStatus.DELIVERED) {
      throw new BadRequestException(
        "Uma demanda entregue não pode ser reatribuída."
      );
    }

    const designerId =
      actor.role === UserRole.DESIGNER ? actor.id : dto.designerId;

    const target = await this.prisma.designer.findFirst({
      where: {
        id: designerId,
        role: UserRole.DESIGNER,
        active: true
      },
      select: { id: true, name: true, email: true }
    });

    if (!target) {
      throw new BadRequestException("Selecione um designer ativo.");
    }

    const updated = await this.prisma.standaloneArtwork.update({
      where: { id },
      data: { designerId: target.id },
      include: {
        client: { select: { id: true, name: true, nextcloudPath: true } },
        designer: { select: { id: true, name: true, email: true } }
      }
    });

    await this.prisma.notification.create({
      data: {
        designerId: target.id,
        type: NotificationType.ACTION,
        title: "Arte avulsa atribuída",
        message: `Você foi definido como responsável por "${updated.title}".`,
        link: "/artes-avulsas"
      }
    });

    await this.createAuditLog(actor, {
      action: "STANDALONE_ARTWORK_DESIGNER_ASSIGNED",
      entityType: "StandaloneArtwork",
      entityId: id,
      summary: `Arte avulsa "${updated.title}" atribuída a ${target.name}.`
    });

    return updated;
  }

  async updateContentProductionStage(
    actor: InternalActor,
    contentItemId: string,
    dto: UpdateContentProductionStageDto
  ) {
    const item = await this.prisma.contentItem.findUnique({
      where: { id: contentItemId },
      select: {
        id: true,
        title: true,
        calendarId: true,
        stage: true,
        productionDesignerId: true
      }
    });

    if (!item) {
      throw new NotFoundException("Conteúdo não encontrado.");
    }

    const calendar = await this.assertCalendarAccess(actor, item.calendarId, item.id);

    if (!calendar.client.active || calendar.archivedAt) {
      throw new BadRequestException(
        "O cliente e o calendário precisam estar ativos para movimentar a demanda."
      );
    }

    if (calendar.stage !== CalendarStage.PRODUCTION) {
      throw new BadRequestException(
        "Só é possível movimentar peças enquanto o calendário está em produção."
      );
    }

    const movableStages = [
      ContentStage.DESIGN_PENDING,
      ContentStage.DESIGN_IN_PROGRESS,
      ContentStage.ART_CHANGES_REQUESTED
    ] as ContentStage[];

    if (!movableStages.includes(item.stage)) {
      throw new BadRequestException(
        "Esta peça não pode ser movimentada manualmente nesta etapa."
      );
    }

    if (
      !([
        ContentStage.DESIGN_PENDING,
        ContentStage.DESIGN_IN_PROGRESS
      ] as ContentStage[]).includes(dto.stage)
    ) {
      throw new BadRequestException(
        "O Kanban permite mover peças de calendário apenas entre aguardando e em produção."
      );
    }

    const updated = await this.prisma.contentItem.update({
      where: { id: contentItemId },
      data: {
        stage: dto.stage,
        productionDesignerId:
          item.productionDesignerId ??
          (actor.role === UserRole.DESIGNER
            ? actor.id
            : calendar.client.assignedDesignerId)
      },
      select: {
        id: true,
        title: true,
        stage: true,
        calendarId: true
      }
    });

    await this.createAuditLog(actor, {
      action: "CONTENT_PRODUCTION_STAGE_CHANGED",
      entityType: "ContentItem",
      entityId: contentItemId,
      summary: `Peça "${updated.title}" movida no Kanban para ${updated.stage}.`
    });

    return updated;
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
        stage: true,
        artworkVersion: true,
        productionDesignerId: true
      }
    });

    if (!item) {
      throw new NotFoundException("Conteúdo não encontrado.");
    }

    const calendar = await this.assertCalendarAccess(actor, item.calendarId, item.id);

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

    const nextVersion = item.artworkVersion + 1;

    await this.prisma.$transaction([
      this.prisma.contentAsset.updateMany({
        where: {
          contentItemId,
          active: true
        },
        data: {
          active: false
        }
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
          artworkVersion: nextVersion,
          productionDesignerId:
            actor.role === UserRole.DESIGNER
              ? actor.id
              : item.productionDesignerId ?? calendar.client.assignedDesignerId,
          assets: {
            create: assets.map((asset, index) => ({
              filePath: asset.storedPath,
              fileName: asset.name,
              fileId: asset.fileId,
              mimeType: asset.mimeType,
              etag: asset.etag,
              sortOrder: index,
              version: nextVersion,
              active: true
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
          where: { active: true },
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

    await sendWorkflowEmail({
      to: calendar.client.credential?.email,
      subject: `Artes para aprovação · ${calendar.title}`,
      lines: [
        `Olá, ${calendar.client.name}.`,
        "",
        `As artes do calendário "${calendar.title}" estão disponíveis para aprovação final.`,
        "Use o link público do calendário para revisar as peças e enviar ajustes quando necessário.",
        "",
        "Terceiro Andar · Aprovação"
      ]
    });

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

    await this.createNotification({
      designerId: actor.id,
      type: NotificationType.PUBLISHING,
      title: "Falha na programação",
      message: dto.message.trim(),
      link: `/calendars/${item.calendarId}`
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
    calendarId: string,
    contentItemId?: string
  ) {
    const calendar = await this.prisma.calendar.findFirst({
      where: {
        id: calendarId,
        ...(actor.role === UserRole.DESIGNER
          ? contentItemId
            ? {
                OR: [
                  {
                    client: {
                      assignedDesignerId: actor.id
                    }
                  },
                  {
                    contentItems: {
                      some: {
                        id: contentItemId,
                        productionDesignerId: actor.id
                      }
                    }
                  }
                ]
              }
            : {
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
            name: true,
            slug: true,
            nextcloudPath: true,
            active: true,
            assignedDesignerId: true,
            credential: {
              select: {
                email: true
              }
            },
            assignedDesigner: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
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

  listBriefingTemplates(_actor: InternalActor) {
    return this.prisma.briefingTemplate.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }]
    });
  }

  async createBriefingTemplate(
    actor: InternalActor,
    dto: CreateBriefingTemplateDto
  ) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);
    this.ensurePlacement(dto.publishToFeed, dto.publishToStories);

    return this.prisma.briefingTemplate.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        niche: dto.niche?.trim() || null,
        contentType: dto.contentType,
        theme: dto.theme?.trim() || null,
        headline: dto.headline?.trim() || null,
        subheadline: dto.subheadline?.trim() || null,
        caption: dto.caption?.trim() || null,
        designerNotes: dto.designerNotes?.trim() || null,
        publishToFeed: dto.publishToFeed,
        publishToStories: dto.publishToStories,
        active: dto.active ?? true
      }
    });
  }

  async updateBriefingTemplate(
    actor: InternalActor,
    id: string,
    dto: UpdateBriefingTemplateDto
  ) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);
    this.ensurePlacement(dto.publishToFeed, dto.publishToStories);

    const existing = await this.prisma.briefingTemplate.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existing) {
      throw new NotFoundException("Modelo de pauta não encontrado.");
    }

    return this.prisma.briefingTemplate.update({
      where: { id },
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        niche: dto.niche?.trim() || null,
        contentType: dto.contentType,
        theme: dto.theme?.trim() || null,
        headline: dto.headline?.trim() || null,
        subheadline: dto.subheadline?.trim() || null,
        caption: dto.caption?.trim() || null,
        designerNotes: dto.designerNotes?.trim() || null,
        publishToFeed: dto.publishToFeed,
        publishToStories: dto.publishToStories,
        active: dto.active ?? true
      }
    });
  }

  async listNotifications(actor: InternalActor) {
    const calendars = await this.prisma.calendar.findMany({
      where: {
        archivedAt: null,
        stage: {
          notIn: [CalendarStage.COMPLETED, CalendarStage.ARCHIVED]
        },
        ...(actor.role === UserRole.DESIGNER
          ? {
              client: {
                assignedDesignerId: actor.id
              }
            }
          : {})
      },
      select: {
        id: true,
        title: true,
        stage: true,
        planningDueAt: true,
        planningApprovalDueAt: true,
        artworkDueAt: true,
        artworkApprovalDueAt: true,
        schedulingDueAt: true,
        client: {
          select: { name: true }
        }
      }
    });

    const now = new Date();

    for (const calendar of calendars) {
      const dueAt =
        calendar.stage === CalendarStage.PLANNING
          ? calendar.planningDueAt
          : calendar.stage === CalendarStage.PRE_APPROVAL
            ? calendar.planningApprovalDueAt
            : calendar.stage === CalendarStage.PRODUCTION
              ? calendar.artworkDueAt
              : calendar.stage === CalendarStage.FINAL_APPROVAL
                ? calendar.artworkApprovalDueAt
                : calendar.stage === CalendarStage.SCHEDULING
                  ? calendar.schedulingDueAt
                  : null;

      if (!dueAt || dueAt >= now) {
        continue;
      }

      const link = `/calendars/${calendar.id}`;
      const existing = await this.prisma.notification.findFirst({
        where: {
          designerId: actor.id,
          type: NotificationType.DEADLINE,
          link,
          readAt: null
        },
        select: { id: true }
      });

      if (!existing) {
        await this.prisma.notification.create({
          data: {
            designerId: actor.id,
            type: NotificationType.DEADLINE,
            title: "Prazo vencido",
            message: `${calendar.client.name} · ${calendar.title} está com a etapa atual atrasada.`,
            link
          }
        });
      }
    }

    return this.prisma.notification.findMany({
      where: { designerId: actor.id },
      orderBy: { createdAt: "desc" },
      take: 60
    });
  }

  async markNotificationRead(actor: InternalActor, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        designerId: actor.id
      },
      select: { id: true }
    });

    if (!notification) {
      throw new NotFoundException("Notificação não encontrada.");
    }

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() }
    });
  }

  async addContentComment(
    actor: InternalActor,
    itemId: string,
    dto: CreateContentCommentDto
  ) {
    const item = await this.prisma.contentItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        calendarId: true
      }
    });

    if (!item) {
      throw new NotFoundException("Conteúdo não encontrado.");
    }

    await this.assertCalendarAccess(actor, item.calendarId);

    return this.prisma.contentComment.create({
      data: {
        contentItemId: itemId,
        authorType: CommentAuthorType.INTERNAL,
        authorDesignerId: actor.id,
        authorName: actor.name,
        message: dto.message.trim(),
        visibleToClient: dto.visibleToClient ?? false
      },
      include: {
        authorDesigner: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });
  }

  async getArtworkVersions(actor: InternalActor, itemId: string) {
    const item = await this.prisma.contentItem.findFirst({
      where: {
        id: itemId,
        ...(actor.role === UserRole.DESIGNER
          ? {
              calendar: {
                client: {
                  assignedDesignerId: actor.id
                }
              }
            }
          : {})
      },
      select: {
        id: true,
        artworkVersion: true,
        assets: {
          orderBy: [{ version: "desc" }, { sortOrder: "asc" }],
          select: {
            id: true,
            fileName: true,
            mimeType: true,
            sortOrder: true,
            version: true,
            active: true,
            createdAt: true
          }
        }
      }
    });

    if (!item) {
      throw new NotFoundException("Conteúdo não encontrado.");
    }

    return item;
  }

  async updateContentMetrics(
    actor: InternalActor,
    itemId: string,
    dto: UpdateContentMetricsDto
  ) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);
    const item = await this.prisma.contentItem.findUnique({
      where: { id: itemId },
      select: { id: true, stage: true }
    });

    if (!item) {
      throw new NotFoundException("Conteúdo não encontrado.");
    }

    if (item.stage !== ContentStage.PUBLISHED) {
      throw new BadRequestException(
        "Métricas só podem ser registradas para conteúdos publicados."
      );
    }

    return this.prisma.contentItem.update({
      where: { id: itemId },
      data: {
        metricReach: dto.reach ?? null,
        metricImpressions: dto.impressions ?? null,
        metricLikes: dto.likes ?? null,
        metricComments: dto.comments ?? null,
        metricShares: dto.shares ?? null,
        metricSaves: dto.saves ?? null,
        metricsUpdatedAt: new Date()
      }
    });
  }

  private optionalDate(value?: string) {
    return value ? new Date(value) : null;
  }

  private async generatePlanningSkeleton(
    calendarId: string,
    clientId: string,
    postingDays: Date[]
  ) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: {
        niche: true,
        region: true
      }
    });

    const commemorativeDates = await this.prisma.commemorativeDate.findMany({
      where: {
        active: true,
        OR: [{ clientId: null }, { clientId }]
      }
    });

    const items = postingDays.map((scheduledDate, index) => {
      const day = scheduledDate.getUTCDate();
      const month = scheduledDate.getUTCMonth() + 1;
      const year = scheduledDate.getUTCFullYear();
      const exactDates = commemorativeDates.filter(
        (date) =>
          date.day === day &&
          date.month === month &&
          (date.year === null || date.year === year)
      );
      const opportunity =
        exactDates.find((date) => {
          if (!date.tags) {
            return false;
          }

          const tags = date.tags.toLowerCase();
          return Boolean(
            (client?.niche && tags.includes(client.niche.toLowerCase())) ||
            (client?.region && tags.includes(client.region.toLowerCase()))
          );
        }) ?? exactDates[0];

      return {
        calendarId,
        title: opportunity
          ? opportunity.name
          : `Pauta ${String(index + 1).padStart(2, "0")}`,
        theme: opportunity?.name ?? "Definir pauta",
        headline: "Definir headline",
        subheadline: null,
        designerNotes: opportunity?.description ?? null,
        scheduledAt: new Date(Date.UTC(year, month - 1, day, 15, 0, 0)),
        channel: Channel.INSTAGRAM,
        contentType: ContentType.POST,
        effortPoints: this.effortPointsForType(ContentType.POST),
        format: "A definir na produção",
        publishToFeed: true,
        publishToStories: false,
        caption: "Definir legenda",
        status: ContentStatus.DRAFT,
        stage: ContentStage.PLANNING,
        planningReady: false,
        sortOrder: index
      };
    });

    if (items.length > 0) {
      await this.prisma.contentItem.createMany({ data: items });
    }
  }

  private async createNotification(input: {
    designerId?: string | null;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
  }) {
    if (!input.designerId) {
      return;
    }

    await this.prisma.notification.create({
      data: {
        designerId: input.designerId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link ?? null
      }
    });
  }

  listAuditLogs(actor: InternalActor) {
    this.requireRoles(actor, UserRole.ADMIN, UserRole.DEV);

    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        actorDesigner: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });
  }

  async createContentAnnotation(
    actor: InternalActor,
    itemId: string,
    dto: CreateContentAnnotationDto
  ) {
    const item = await this.prisma.contentItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        title: true,
        calendarId: true
      }
    });

    if (!item) {
      throw new NotFoundException("Conteúdo não encontrado.");
    }

    await this.assertCalendarAccess(actor, item.calendarId);

    if (dto.assetId) {
      const asset = await this.prisma.contentAsset.findFirst({
        where: {
          id: dto.assetId,
          contentItemId: itemId,
          active: true
        },
        select: { id: true }
      });

      if (!asset) {
        throw new BadRequestException("A arte selecionada não está disponível.");
      }
    }

    const annotation = await this.prisma.contentAnnotation.create({
      data: {
        contentItemId: itemId,
        assetId: dto.assetId ?? null,
        authorType: CommentAuthorType.INTERNAL,
        authorDesignerId: actor.id,
        authorName: actor.name,
        x: dto.x / 100,
        y: dto.y / 100,
        message: dto.message.trim()
      },
      include: {
        authorDesigner: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });

    await this.createAuditLog(actor, {
      action: "ANNOTATION_CREATED",
      entityType: "ContentItem",
      entityId: itemId,
      summary: `Comentário marcado na arte de "${item.title}".`
    });

    return annotation;
  }

  async resolveContentAnnotation(
    actor: InternalActor,
    annotationId: string,
    resolved: boolean
  ) {
    const annotation = await this.prisma.contentAnnotation.findUnique({
      where: { id: annotationId },
      select: {
        id: true,
        contentItemId: true,
        contentItem: {
          select: {
            calendarId: true,
            title: true
          }
        }
      }
    });

    if (!annotation) {
      throw new NotFoundException("Marcação não encontrada.");
    }

    await this.assertCalendarAccess(actor, annotation.contentItem.calendarId);

    const updated = await this.prisma.contentAnnotation.update({
      where: { id: annotationId },
      data: {
        resolvedAt: resolved ? new Date() : null
      }
    });

    await this.createAuditLog(actor, {
      action: resolved ? "ANNOTATION_RESOLVED" : "ANNOTATION_REOPENED",
      entityType: "ContentItem",
      entityId: annotation.contentItemId,
      summary: `Marcação ${resolved ? "resolvida" : "reaberta"} em "${annotation.contentItem.title}".`
    });

    return updated;
  }

  private effortPointsForType(type: ContentType) {
    if (type === ContentType.REEL) {
      return 3;
    }

    if (type === ContentType.CAROUSEL) {
      return 2;
    }

    return 1;
  }

  private async createAuditLog(
    actor: InternalActor,
    input: {
      action: string;
      entityType: string;
      entityId: string;
      summary: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorDesignerId: actor.id,
        actorName: actor.name,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        summary: input.summary,
        metadata: input.metadata
          ? JSON.parse(JSON.stringify(input.metadata))
          : undefined
      }
    });
  }

  async getClientContractUsage(actor: InternalActor, clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: {
        id: clientId,
        ...(actor.role === UserRole.DESIGNER
          ? { assignedDesignerId: actor.id }
          : {})
      },
      select: {
        id: true,
        name: true,
        monthlyPostLimit: true,
        monthlyCarouselLimit: true,
        monthlyReelLimit: true,
        monthlyStoryLimit: true,
        monthlyStandaloneLimit: true,
        monthlyPointsLimit: true
      }
    });

    if (!client) {
      throw new NotFoundException("Cliente não encontrado.");
    }

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [calendarItems, standalone] = await Promise.all([
      this.prisma.contentItem.findMany({
        where: {
          calendar: { clientId },
          scheduledAt: { gte: start, lt: end }
        },
        select: {
          contentType: true,
          effortPoints: true
        }
      }),
      this.prisma.standaloneArtwork.findMany({
        where: {
          clientId,
          createdAt: { gte: start, lt: end },
          status: { not: StandaloneArtworkStatus.CANCELLED }
        },
        select: {
          quantity: true,
          effortPoints: true,
          contentType: true,
          outputs: {
            select: {
              contentType: true,
              quantity: true,
              effortPoints: true
            }
          }
        }
      })
    ]);

    const calendarByType = {
      POST: calendarItems.filter((item) => item.contentType === ContentType.POST).length,
      CAROUSEL: calendarItems.filter((item) => item.contentType === ContentType.CAROUSEL).length,
      REEL: calendarItems.filter((item) => item.contentType === ContentType.REEL).length,
      STORY: calendarItems.filter((item) => item.contentType === ContentType.STORY).length
    };

    const standalonePieces = standalone.reduce(
      (sum, item) =>
        sum +
        (item.outputs.length > 0
          ? item.outputs.reduce((outputSum, output) => outputSum + output.quantity, 0)
          : item.quantity),
      0
    );
    const standaloneByType = {
      POST: standalone.reduce(
        (sum, item) =>
          sum +
          (item.outputs.length > 0
            ? item.outputs
                .filter((output) => output.contentType === ContentType.POST)
                .reduce((outputSum, output) => outputSum + output.quantity, 0)
            : item.contentType === ContentType.POST
              ? item.quantity
              : 0),
        0
      ),
      CAROUSEL: standalone.reduce(
        (sum, item) =>
          sum +
          (item.outputs.length > 0
            ? item.outputs
                .filter((output) => output.contentType === ContentType.CAROUSEL)
                .reduce((outputSum, output) => outputSum + output.quantity, 0)
            : item.contentType === ContentType.CAROUSEL
              ? item.quantity
              : 0),
        0
      ),
      REEL: standalone.reduce(
        (sum, item) =>
          sum +
          (item.outputs.length > 0
            ? item.outputs
                .filter((output) => output.contentType === ContentType.REEL)
                .reduce((outputSum, output) => outputSum + output.quantity, 0)
            : item.contentType === ContentType.REEL
              ? item.quantity
              : 0),
        0
      ),
      STORY: standalone.reduce(
        (sum, item) =>
          sum +
          (item.outputs.length > 0
            ? item.outputs
                .filter((output) => output.contentType === ContentType.STORY)
                .reduce((outputSum, output) => outputSum + output.quantity, 0)
            : item.contentType === ContentType.STORY
              ? item.quantity
              : 0),
        0
      )
    };
    const points =
      calendarItems.reduce((sum, item) => sum + item.effortPoints, 0) +
      standalone.reduce((sum, item) => sum + item.effortPoints, 0);

    return {
      clientId: client.id,
      clientName: client.name,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      usage: {
        post: calendarByType.POST + standaloneByType.POST,
        carousel: calendarByType.CAROUSEL + standaloneByType.CAROUSEL,
        reel: calendarByType.REEL + standaloneByType.REEL,
        story: calendarByType.STORY + standaloneByType.STORY,
        standalone: standalonePieces,
        points
      },
      limits: {
        post: client.monthlyPostLimit,
        carousel: client.monthlyCarouselLimit,
        reel: client.monthlyReelLimit,
        story: client.monthlyStoryLimit,
        standalone: client.monthlyStandaloneLimit,
        points: client.monthlyPointsLimit
      }
    };
  }

  async listStandaloneArtworks(actor: InternalActor) {
    return this.prisma.standaloneArtwork.findMany({
      where:
        actor.role === UserRole.DESIGNER
          ? { designerId: actor.id }
          : undefined,
      include: {
        client: {
          select: { id: true, name: true, nextcloudPath: true }
        },
        designer: {
          select: { id: true, name: true, email: true }
        },
        outputs: {
          orderBy: { sortOrder: "asc" }
        }
      },
      orderBy: [
        { status: "asc" },
        { dueAt: "asc" },
        { createdAt: "desc" }
      ]
    });
  }

  async createStandaloneArtwork(
    actor: InternalActor,
    dto: CreateStandaloneArtworkDto
  ) {
    const client = await this.prisma.client.findFirst({
      where: {
        id: dto.clientId,
        active: true,
        ...(actor.role === UserRole.DESIGNER
          ? { assignedDesignerId: actor.id }
          : {})
      },
      select: {
        id: true,
        name: true,
        defaultStandaloneSlaHours: true
      }
    });

    if (!client) {
      throw new ForbiddenException(
        "Você não tem acesso a este cliente ou ele está inativo."
      );
    }

    const designerId =
      actor.role === UserRole.DESIGNER ? actor.id : dto.designerId;

    const designer = await this.prisma.designer.findFirst({
      where: {
        id: designerId,
        role: UserRole.DESIGNER,
        active: true
      },
      select: { id: true, name: true }
    });

    if (!designer) {
      throw new BadRequestException("Selecione um designer ativo.");
    }

    const normalizedOutputs =
      dto.outputs && dto.outputs.length > 0
        ? dto.outputs.map((output, index) => {
            if (!Object.values(ContentType).includes(output.contentType)) {
              throw new BadRequestException("Tipo de entrega inválido.");
            }
            const quantity = Number(output.quantity);
            const effortPoints = Number(output.effortPoints);
            if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
              throw new BadRequestException("Quantidade inválida em uma entrega.");
            }
            if (!Number.isInteger(effortPoints) || effortPoints < 1 || effortPoints > 200) {
              throw new BadRequestException("Pontos inválidos em uma entrega.");
            }
            return {
              contentType: output.contentType,
              formatLabel: output.formatLabel?.trim() || null,
              quantity,
              effortPoints,
              sortOrder: index
            };
          })
        : [
            {
              contentType: dto.contentType,
              formatLabel: dto.formatLabel?.trim() || null,
              quantity: dto.quantity,
              effortPoints: dto.effortPoints,
              sortOrder: 0
            }
          ];

    const totalQuantity = normalizedOutputs.reduce(
      (sum, output) => sum + output.quantity,
      0
    );
    const createdAt = new Date();
    const [year, month] = saoPauloDateKey(createdAt).split("-");
    const folderName = `${safeNextcloudSegment(dto.title)}-${randomBytes(3).toString("hex")}`;
    const generatedNextcloudPath =
      `/Artes avulsas/${year}/${month}/${folderName}`;

    const nextcloudPath = (
      await this.nextcloud.ensureFolderForActor(
        actor,
        client.id,
        generatedNextcloudPath
      )
    ).path;

    const artwork = await this.prisma.standaloneArtwork.create({
      data: {
        clientId: client.id,
        designerId: designer.id,
        title: dto.title.trim(),
        briefing: dto.briefing.trim(),
        contentType: normalizedOutputs[0].contentType,
        formatLabel: normalizedOutputs[0].formatLabel,
        quantity: totalQuantity,
        effortPoints: dto.effortPoints,
        outputs: {
          create: normalizedOutputs
        },
        priority: dto.priority ?? ArtworkPriority.NORMAL,
        dueAt: dto.dueAt
          ? new Date(dto.dueAt)
          : new Date(
              Date.now() +
                client.defaultStandaloneSlaHours * 60 * 60 * 1000
            ),
        nextcloudPath
      },
      include: {
        client: { select: { id: true, name: true, nextcloudPath: true } },
        designer: { select: { id: true, name: true, email: true } }
      }
    });

    await this.createAuditLog(actor, {
      action: "STANDALONE_ARTWORK_CREATED",
      entityType: "StandaloneArtwork",
      entityId: artwork.id,
      summary: `Arte avulsa "${artwork.title}" criada para ${client.name}.`
    });

    return artwork;
  }

  async updateStandaloneArtworkStatus(
    actor: InternalActor,
    id: string,
    dto: UpdateStandaloneArtworkStatusDto
  ) {
    const artwork = await this.prisma.standaloneArtwork.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true } }
      }
    });

    if (!artwork) {
      throw new NotFoundException("Arte avulsa não encontrada.");
    }

    if (
      actor.role === UserRole.DESIGNER &&
      artwork.designerId !== actor.id
    ) {
      throw new ForbiddenException("Esta demanda não está atribuída a você.");
    }

    const now = new Date();
    const data: {
      status: StandaloneArtworkStatus;
      startedAt?: Date;
      approvedAt?: Date;
      completedAt?: Date;
      revisionCount?: number;
      nextcloudPath?: string | null;
    } = {
      status: dto.status
    };

    if (
      dto.status === StandaloneArtworkStatus.IN_PRODUCTION &&
      !artwork.startedAt
    ) {
      data.startedAt = now;
    }

    if (dto.status === StandaloneArtworkStatus.CHANGES_REQUESTED) {
      data.revisionCount = artwork.revisionCount + 1;
    }

    if (dto.status === StandaloneArtworkStatus.APPROVED) {
      data.approvedAt = artwork.approvedAt ?? now;
    }

    if (dto.status === StandaloneArtworkStatus.DELIVERED) {
      data.approvedAt = artwork.approvedAt ?? now;
      data.completedAt = artwork.completedAt ?? now;
    }

    if (dto.nextcloudPath !== undefined) {
      data.nextcloudPath = dto.nextcloudPath.trim() || null;
    }

    const updated = await this.prisma.standaloneArtwork.update({
      where: { id },
      data,
      include: {
        client: { select: { id: true, name: true, nextcloudPath: true } },
        designer: { select: { id: true, name: true, email: true } }
      }
    });

    await this.createAuditLog(actor, {
      action: "STANDALONE_ARTWORK_STATUS_CHANGED",
      entityType: "StandaloneArtwork",
      entityId: id,
      summary: `Arte avulsa "${updated.title}" alterada para ${updated.status}.`
    });

    return updated;
  }

  async getProductivity(actor: InternalActor) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const designers = await this.prisma.designer.findMany({
      where: {
        active: true,
        role: UserRole.DESIGNER,
        ...(actor.role === UserRole.DESIGNER ? { id: actor.id } : {})
      },
      select: {
        id: true,
        name: true,
        weeklyCapacityPoints: true
      },
      orderBy: { name: "asc" }
    });

    const [calendarItems, standalone] = await Promise.all([
      this.prisma.contentItem.findMany({
        where: {
          productionDesignerId: { in: designers.map((designer) => designer.id) },
          artworkApprovedAt: { gte: start, lt: end }
        },
        select: {
          productionDesignerId: true,
          effortPoints: true,
          contentType: true,
          artworkApprovedAt: true
        }
      }),
      this.prisma.standaloneArtwork.findMany({
        where: {
          designerId: { in: designers.map((designer) => designer.id) },
          completedAt: { gte: start, lt: end },
          status: StandaloneArtworkStatus.DELIVERED
        },
        select: {
          designerId: true,
          quantity: true,
          effortPoints: true,
          revisionCount: true,
          completedAt: true
        }
      })
    ]);

    return designers.map((designer) => {
      const calendarProduction = calendarItems.filter(
        (item) => item.productionDesignerId === designer.id
      );
      const standaloneProduction = standalone.filter(
        (item) => item.designerId === designer.id
      );
      const calendarPieces = calendarProduction.length;
      const standalonePieces = standaloneProduction.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      const calendarPoints = calendarProduction.reduce(
        (sum, item) => sum + item.effortPoints,
        0
      );
      const standalonePoints = standaloneProduction.reduce(
        (sum, item) => sum + item.effortPoints,
        0
      );

      return {
        designer,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        calendarPieces,
        standalonePieces,
        totalPieces: calendarPieces + standalonePieces,
        calendarPoints,
        standalonePoints,
        totalPoints: calendarPoints + standalonePoints,
        revisions: standaloneProduction.reduce(
          (sum, item) => sum + item.revisionCount,
          0
        )
      };
    });
  }

  private validateCommemorativeDate(
    day: number,
    month: number,
    year?: number
  ) {
    const sampleYear = year ?? 2024;
    const date = new Date(Date.UTC(sampleYear, month - 1, day));

    if (
      date.getUTCFullYear() !== sampleYear ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new BadRequestException("Informe uma data comemorativa válida.");
    }
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
