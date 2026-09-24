import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  Channel,
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
  CreateCalendarDto,
  CreateClientDto,
  CreateContentFormatDto,
  CreateContentItemDto,
  CreateDesignerDto,
  MoveContentItemDto,
  UpdateCalendarDto,
  UpdateClientDto,
  UpdateContentFormatDto,
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
      role: true
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
        role: UserRole.DESIGNER
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
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
        role: targetRole
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
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
          role: UserRole.DEV
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
      select: { id: true }
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
        ...(password ? { passwordHash: hashPassword(password) } : {})
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
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
    await this.assertClientAccess(actor, dto.clientId);
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
    const calendar = await this.assertCalendarAccess(actor, calendarId);

    if (calendar.archivedAt) {
      throw new BadRequestException(
        "Restaure o calendário antes de editá-lo."
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
    const calendar = await this.assertCalendarAccess(actor, calendarId);

    if (calendar.archivedAt) {
      return calendar;
    }

    return this.prisma.calendar.update({
      where: { id: calendarId },
      data: {
        archivedAt: new Date()
      }
    });
  }

  async restoreCalendar(actor: InternalActor, calendarId: string) {
    await this.assertCalendarAccess(actor, calendarId);

    return this.prisma.calendar.update({
      where: { id: calendarId },
      data: {
        archivedAt: null
      }
    });
  }

  async createContentItem(
    actor: InternalActor,
    dto: CreateContentItemDto
  ) {
    const calendar = await this.assertCalendarAccess(actor, dto.calendarId);

    if (calendar.archivedAt) {
      throw new BadRequestException(
        "Restaure o calendário antes de adicionar conteúdos."
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
      (item) => saoPauloDateKey(item.scheduledAt) === dto.postingDate
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

    if (!dto.publishToFeed && !dto.publishToStories) {
      throw new BadRequestException(
        "Selecione Feed, Stories ou ambos para a publicação."
      );
    }

    if (dto.contentType !== ContentType.CAROUSEL && dto.assetPaths.length > 1) {
      throw new BadRequestException(
        "Post, Reels e Stories aceitam uma arte por peça. Use Carrossel para selecionar várias."
      );
    }

    const format = await this.prisma.contentFormat.findFirst({
      where: {
        id: dto.formatId,
        active: true
      }
    });

    if (!format) {
      throw new BadRequestException("Formato não encontrado ou inativo.");
    }

    if (format.contentType !== dto.contentType) {
      throw new BadRequestException(
        "O formato selecionado não corresponde ao tipo de conteúdo."
      );
    }

    if (
      (dto.publishToFeed && !format.supportsFeed) ||
      (dto.publishToStories && !format.supportsStories)
    ) {
      throw new BadRequestException(
        "O formato selecionado não suporta os destinos escolhidos."
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

    return this.prisma.contentItem.create({
      data: {
        calendarId: dto.calendarId,
        formatId: format.id,
        title: dto.title.trim(),
        scheduledAt,
        channel: dto.channel ?? Channel.INSTAGRAM,
        contentType: dto.contentType,
        format: `${format.name} · ${format.width}x${format.height}`,
        publishToFeed: dto.publishToFeed,
        publishToStories: dto.publishToStories,
        caption: dto.caption.trim(),
        assetUrl: dto.assetUrl?.trim() || null,
        status: ContentStatus.PENDING_APPROVAL,
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

  async moveContentItem(
    actor: InternalActor,
    contentItemId: string,
    dto: MoveContentItemDto
  ) {
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

    if (calendar.archivedAt) {
      throw new BadRequestException(
        "Restaure o calendário antes de remanejar conteúdos."
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
      data: { scheduledAt },
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
    const calendar = await this.assertCalendarAccess(actor, calendarId);

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
      select: { id: true }
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
            nextcloudPath: true
          }
        },
        postingDays: true,
        contentItems: {
          select: {
            id: true,
            scheduledAt: true
          }
        }
      }
    });

    if (!calendar) {
      throw new ForbiddenException("Você não tem acesso a este calendário.");
    }

    return calendar;
  }

  private async ensureDesigner(id: string) {
    const designer = await this.prisma.designer.findFirst({
      where: {
        id,
        role: UserRole.DESIGNER
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
