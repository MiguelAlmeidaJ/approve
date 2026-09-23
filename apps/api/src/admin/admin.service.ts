import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ContentStatus, UserRole } from "@approve/database";
import { randomBytes, scryptSync } from "node:crypto";
import { PrismaService } from "../prisma.service";
import {
  AssignClientDto,
  CreateCalendarDto,
  CreateClientDto,
  CreateContentItemDto,
  CreateDesignerDto,
  UpdateUserDto,
} from "./admin.dto";

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");

  return `scrypt:${salt}:${hash}`;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  dashboard() {
    return this.prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        assignedDesigner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        calendars: {
          orderBy: { periodStart: "desc" },
          include: {
            postingDays: {
              orderBy: { scheduledDate: "asc" },
            },
            contentItems: {
              orderBy: [{ scheduledAt: "asc" }, { sortOrder: "asc" }],
            },
          },
        },
      },
    });
  }

  listDesigners() {
    return this.prisma.designer.findMany({
      where: {
        role: UserRole.DESIGNER,
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
            clients: true,
          },
        },
      },
    });
  }

  listUsers() {
    return this.prisma.designer.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            clients: true,
          },
        },
      },
    });
  }

  async getClient(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        assignedDesigner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        calendars: {
          orderBy: { periodStart: "desc" },
          include: {
            postingDays: {
              orderBy: { scheduledDate: "asc" },
            },
            contentItems: {
              orderBy: [{ scheduledAt: "asc" }, { sortOrder: "asc" }],
            },
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException("Cliente não encontrado.");
    }

    return client;
  }

  async getCalendar(id: string) {
    const calendar = await this.prisma.calendar.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            assignedDesigner: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        contentItems: {
          orderBy: [{ scheduledAt: "asc" }, { sortOrder: "asc" }],
          include: {
            reviews: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
        postingDays: {
          orderBy: { scheduledDate: "asc" },
        },
      },
    });

    if (!calendar) {
      throw new NotFoundException("Calendário não encontrado.");
    }

    return calendar;
  }

  async createDesigner(dto: CreateDesignerDto) {
    return this.createUser({ ...dto, role: UserRole.DESIGNER });
  }

  async createUser(dto: CreateDesignerDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.designer.findUnique({
      where: { email },
    });

    if (existing) {
      throw new BadRequestException("Já existe um usuário com esse e-mail.");
    }

    return this.prisma.designer.create({
      data: {
        name: dto.name.trim(),
        email,
        passwordHash: hashPassword(dto.password),
        role: dto.role ?? UserRole.DESIGNER,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const current = await this.prisma.designer.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        _count: { select: { clients: true } },
      },
    });

    if (!current) {
      throw new NotFoundException("Usuário não encontrado.");
    }

    if (
      current.role === UserRole.DESIGNER &&
      dto.role !== UserRole.DESIGNER &&
      current._count.clients > 0
    ) {
      throw new BadRequestException(
        "Reatribua os clientes deste designer antes de alterar o perfil.",
      );
    }

    const email = dto.email.trim().toLowerCase();
    const emailOwner = await this.prisma.designer.findUnique({
      where: { email },
      select: { id: true },
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
        ...(password ? { passwordHash: hashPassword(password) } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (password) {
      await this.prisma.designerSession.deleteMany({
        where: { designerId: id },
      });
    }

    return updated;
  }

  async createClient(dto: CreateClientDto) {
    const baseSlug = (dto.slug || dto.name)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    if (!baseSlug) {
      throw new BadRequestException(
        "Não foi possível gerar um slug para o cliente.",
      );
    }

    if (dto.assignedDesignerId) {
      await this.ensureDesigner(dto.assignedDesignerId);
    }

    const existing = await this.prisma.client.findUnique({
      where: { slug: baseSlug },
    });

    const slug = existing
      ? `${baseSlug}-${randomBytes(2).toString("hex")}`
      : baseSlug;

    return this.prisma.client.create({
      data: {
        name: dto.name.trim(),
        slug,
        assignedDesignerId: dto.assignedDesignerId || null,
      },
    });
  }

  async assignClient(clientId: string, dto: AssignClientDto) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
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
        assignedDesignerId: dto.designerId || null,
      },
      include: {
        assignedDesigner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async createCalendar(dto: CreateCalendarDto) {
    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);
    const postingDays = [
      ...new Set(
        dto.postingDays.map((value) => new Date(value).toISOString()),
      ),
    ].map((value) => new Date(value));

    if (periodEnd < periodStart) {
      throw new BadRequestException(
        "A data final do calendário deve ser posterior à data inicial.",
      );
    }

    if (
      postingDays.some(
        (scheduledDate) =>
          scheduledDate < periodStart || scheduledDate > periodEnd,
      )
    ) {
      throw new BadRequestException(
        "Todos os dias de postagem devem pertencer ao período do calendário.",
      );
    }

    return this.prisma.calendar.create({
      data: {
        clientId: dto.clientId,
        title: dto.title.trim(),
        periodStart,
        periodEnd,
        shareToken: randomBytes(24).toString("hex"),
        postingDays: {
          create: postingDays.map((scheduledDate) => ({ scheduledDate })),
        },
      },
      include: {
        postingDays: {
          orderBy: { scheduledDate: "asc" },
        },
      },
    });
  }

  createContentItem(dto: CreateContentItemDto) {
    return this.prisma.contentItem.create({
      data: {
        calendarId: dto.calendarId,
        title: dto.title.trim(),
        scheduledAt: new Date(dto.scheduledAt),
        channel: dto.channel,
        format: dto.format.trim(),
        caption: dto.caption.trim(),
        assetUrl: dto.assetUrl?.trim() || null,
        status: ContentStatus.PENDING_APPROVAL,
      },
    });
  }

  rotateCalendarToken(calendarId: string) {
    return this.prisma.calendar.update({
      where: { id: calendarId },
      data: {
        shareToken: randomBytes(24).toString("hex"),
      },
    });
  }

  private async ensureDesigner(id: string) {
    const designer = await this.prisma.designer.findFirst({
      where: {
        id,
        role: UserRole.DESIGNER,
      },
      select: { id: true },
    });

    if (!designer) {
      throw new BadRequestException(
        "O responsável informado não é um designer válido.",
      );
    }
  }
}
