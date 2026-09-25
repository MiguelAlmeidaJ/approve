import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  ApprovalPhase,
  CalendarStage,
  ContentStage,
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
        archivedAt: null,
        stage: {
          notIn: [CalendarStage.PLANNING, CalendarStage.ARCHIVED]
        },
        client: {
          active: true
        }
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
              take: 3
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
        archivedAt: null,
        stage: {
          in: [CalendarStage.PRE_APPROVAL, CalendarStage.FINAL_APPROVAL]
        },
        client: {
          active: true
        }
      },
      select: {
        id: true,
        stage: true
      }
    });

    if (!calendar) {
      throw new NotFoundException(
        "Este calendário não está aguardando aprovação."
      );
    }

    const phase =
      calendar.stage === CalendarStage.PRE_APPROVAL
        ? ApprovalPhase.PLANNING
        : ApprovalPhase.ARTWORK;

    const item = await this.prisma.contentItem.findFirst({
      where: {
        id: contentItemId,
        calendarId: calendar.id
      }
    });

    if (!item) {
      throw new NotFoundException("Conteúdo não encontrado neste calendário.");
    }

    const allowed =
      phase === ApprovalPhase.PLANNING
        ? [
            ContentStage.PRE_APPROVAL_PENDING,
            ContentStage.PRE_CHANGES_REQUESTED
          ].includes(item.stage)
        : [
            ContentStage.ART_APPROVAL_PENDING,
            ContentStage.ART_CHANGES_REQUESTED
          ].includes(item.stage);

    if (!allowed) {
      throw new BadRequestException(
        "Esta peça não está aguardando aprovação nesta etapa."
      );
    }

    const message = dto.message?.trim();

    if (dto.action === ReviewAction.CHANGES_REQUESTED && !message) {
      throw new BadRequestException(
        "Descreva o que precisa ser alterado antes de solicitar ajustes."
      );
    }

    const approved = dto.action === ReviewAction.APPROVED;
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.contentItem.update({
        where: { id: item.id },
        data:
          phase === ApprovalPhase.PLANNING
            ? {
                stage: approved
                  ? ContentStage.PRE_APPROVED
                  : ContentStage.PRE_CHANGES_REQUESTED,
                status: approved
                  ? ContentStatus.APPROVED
                  : ContentStatus.CHANGES_REQUESTED,
                reviewedAt: now,
                planningApprovedAt: approved ? now : null
              }
            : {
                stage: approved
                  ? ContentStage.ART_APPROVED
                  : ContentStage.ART_CHANGES_REQUESTED,
                status: approved
                  ? ContentStatus.APPROVED
                  : ContentStatus.CHANGES_REQUESTED,
                reviewedAt: now,
                artworkApprovedAt: approved ? now : null
              }
      }),
      this.prisma.reviewHistory.create({
        data: {
          contentItemId: item.id,
          phase,
          action: dto.action,
          message: message || null,
          reviewerName: dto.reviewerName?.trim() || null
        }
      })
    ]);

    await this.syncCalendarAfterReview(calendar.id, phase);

    return { ok: true };
  }

  private async syncCalendarAfterReview(
    calendarId: string,
    phase: ApprovalPhase
  ) {
    const items = await this.prisma.contentItem.findMany({
      where: { calendarId },
      select: {
        stage: true
      }
    });

    if (phase === ApprovalPhase.PLANNING) {
      const stillPending = items.some(
        (item) => item.stage === ContentStage.PRE_APPROVAL_PENDING
      );

      if (stillPending) {
        return;
      }

      const hasChanges = items.some(
        (item) => item.stage === ContentStage.PRE_CHANGES_REQUESTED
      );

      if (hasChanges) {
        return;
      }

      await this.prisma.$transaction([
        this.prisma.calendar.update({
          where: { id: calendarId },
          data: { stage: CalendarStage.PRODUCTION }
        }),
        this.prisma.contentItem.updateMany({
          where: {
            calendarId,
            stage: ContentStage.PRE_APPROVED
          },
          data: {
            stage: ContentStage.DESIGN_PENDING,
            status: ContentStatus.DRAFT
          }
        })
      ]);

      return;
    }

    const stillPending = items.some(
      (item) => item.stage === ContentStage.ART_APPROVAL_PENDING
    );

    if (stillPending) {
      return;
    }

    const hasChanges = items.some(
      (item) => item.stage === ContentStage.ART_CHANGES_REQUESTED
    );

    if (hasChanges) {
      await this.prisma.calendar.update({
        where: { id: calendarId },
        data: { stage: CalendarStage.PRODUCTION }
      });
      return;
    }

    await this.prisma.$transaction([
      this.prisma.calendar.update({
        where: { id: calendarId },
        data: { stage: CalendarStage.SCHEDULING }
      }),
      this.prisma.contentItem.updateMany({
        where: {
          calendarId,
          stage: ContentStage.ART_APPROVED
        },
        data: {
          stage: ContentStage.READY_TO_SCHEDULE
        }
      })
    ]);
  }
}
