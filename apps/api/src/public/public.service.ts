import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  ContentStatus,
  ReviewAction
} from "@approve/database";
import { PrismaService } from "../prisma.service";
import { ReviewContentDto } from "./public.dto";

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async getCalendar(token: string) {
    const calendar = await this.prisma.calendar.findFirst({
      where: {
        shareToken: token,
        archivedAt: null
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            slug: true,
            niche: true
          }
        },
        contentItems: {
          where: {
            status: {
              not: ContentStatus.DRAFT
            }
          },
          orderBy: [{ scheduledAt: "asc" }, { sortOrder: "asc" }],
          include: {
            formatPreset: true,
            assets: {
              orderBy: {
                sortOrder: "asc"
              },
              select: {
                id: true,
                mimeType: true,
                sortOrder: true
              }
            },
            reviews: {
              orderBy: { createdAt: "desc" },
              take: 1
            }
          }
        }
      }
    });

    if (!calendar) {
      throw new NotFoundException("Calendário público não encontrado.");
    }

    return calendar;
  }

  async review(
    token: string,
    contentItemId: string,
    dto: ReviewContentDto
  ) {
    const calendar = await this.prisma.calendar.findFirst({
      where: {
        shareToken: token,
        archivedAt: null
      },
      select: { id: true }
    });

    if (!calendar) {
      throw new NotFoundException("Calendário público não encontrado.");
    }

    const item = await this.prisma.contentItem.findFirst({
      where: {
        id: contentItemId,
        calendarId: calendar.id,
        status: {
          not: ContentStatus.DRAFT
        }
      }
    });

    if (!item) {
      throw new NotFoundException("Conteúdo não encontrado neste calendário.");
    }

    const message = dto.message?.trim();

    if (dto.action === ReviewAction.CHANGES_REQUESTED && !message) {
      throw new BadRequestException(
        "Descreva o que precisa ser alterado antes de solicitar ajustes."
      );
    }

    const status =
      dto.action === ReviewAction.APPROVED
        ? ContentStatus.APPROVED
        : ContentStatus.CHANGES_REQUESTED;

    const [, review] = await this.prisma.$transaction([
      this.prisma.contentItem.update({
        where: { id: item.id },
        data: {
          status,
          reviewedAt: new Date()
        }
      }),
      this.prisma.reviewHistory.create({
        data: {
          contentItemId: item.id,
          action: dto.action,
          message: message || null,
          reviewerName: dto.reviewerName?.trim() || null
        }
      })
    ]);

    return review;
  }

}
