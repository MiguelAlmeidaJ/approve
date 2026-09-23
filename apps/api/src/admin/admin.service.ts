import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { ContentStatus } from "@approve/database";
import { randomBytes } from "node:crypto";
import { PrismaService } from "../prisma.service";
import {
  CreateCalendarDto,
  CreateClientDto,
  CreateContentItemDto
} from "./admin.dto";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  dashboard() {
    return this.prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        calendars: {
          orderBy: { periodStart: "desc" },
          include: {
            contentItems: {
              orderBy: [{ scheduledAt: "asc" }, { sortOrder: "asc" }]
            }
          }
        }
      }
    });
  }

  async getClient(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        calendars: {
          orderBy: { periodStart: "desc" },
          include: {
            contentItems: {
              orderBy: [{ scheduledAt: "asc" }, { sortOrder: "asc" }]
            }
          }
        }
      }
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
        client: true,
        contentItems: {
          orderBy: [{ scheduledAt: "asc" }, { sortOrder: "asc" }],
          include: {
            reviews: {
              orderBy: { createdAt: "desc" },
              take: 1
            }
          }
        }
      }
    });

    if (!calendar) {
      throw new NotFoundException("Calendário não encontrado.");
    }

    return calendar;
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
        "Não foi possível gerar um slug para o cliente."
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
        slug
      }
    });
  }

  async createCalendar(dto: CreateCalendarDto) {
    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    if (periodEnd < periodStart) {
      throw new BadRequestException(
        "A data final do calendário deve ser posterior à data inicial."
      );
    }

    return this.prisma.calendar.create({
      data: {
        clientId: dto.clientId,
        title: dto.title.trim(),
        periodStart,
        periodEnd,
        shareToken: randomBytes(24).toString("hex")
      }
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
        status: ContentStatus.PENDING_APPROVAL
      }
    });
  }

  rotateCalendarToken(calendarId: string) {
    return this.prisma.calendar.update({
      where: { id: calendarId },
      data: {
        shareToken: randomBytes(24).toString("hex")
      }
    });
  }
}
