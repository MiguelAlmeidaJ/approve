import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import {
  ContentStatus,
  ReviewAction
} from "@approve/database";
import { createHash } from "node:crypto";
import { PrismaService } from "../prisma.service";
import { ReviewContentDto } from "./public.dto";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async getCalendar(clientToken: string, token: string) {
    const clientId = await this.getClientId(clientToken);

    const calendar = await this.prisma.calendar.findFirst({
      where: {
        shareToken: token,
        clientId
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
            reviews: {
              orderBy: { createdAt: "desc" },
              take: 1
            }
          }
        }
      }
    });

    if (!calendar) {
      throw new NotFoundException("Calendário não encontrado para esta conta.");
    }

    return calendar;
  }

  async review(
    clientToken: string,
    token: string,
    contentItemId: string,
    dto: ReviewContentDto
  ) {
    const clientId = await this.getClientId(clientToken);
    const calendar = await this.prisma.calendar.findFirst({
      where: {
        shareToken: token,
        clientId
      },
      select: { id: true }
    });

    if (!calendar) {
      throw new NotFoundException("Calendário não encontrado para esta conta.");
    }

    const item = await this.prisma.contentItem.findFirst({
      where: {
        id: contentItemId,
        calendarId: calendar.id
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

  private async getClientId(token: string) {
    if (!token) {
      throw new UnauthorizedException("Sessão do cliente não informada.");
    }

    const session = await this.prisma.clientSession.findUnique({
      where: {
        tokenHash: hashToken(token)
      },
      select: {
        clientId: true,
        expiresAt: true
      }
    });

    if (!session || session.expiresAt <= new Date()) {
      throw new UnauthorizedException("Sessão do cliente expirada.");
    }

    return session.clientId;
  }
}
