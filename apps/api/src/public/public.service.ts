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
import { sendWorkflowEmail } from "../auth/smtp-mailer";
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
              where: {
                active: true
              },
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
            },
            comments: {
              where: {
                OR: [
                  { authorType: "CLIENT" },
                  { visibleToClient: true }
                ]
              },
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                authorType: true,
                authorName: true,
                message: true,
                createdAt: true
              }
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
        stage: true,
        title: true,
        client: {
          select: {
            assignedDesignerId: true,
            assignedDesigner: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
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
        ? ([
            ContentStage.PRE_APPROVAL_PENDING,
            ContentStage.PRE_CHANGES_REQUESTED
          ] as ContentStage[]).includes(item.stage)
        : ([
            ContentStage.ART_APPROVAL_PENDING,
            ContentStage.ART_CHANGES_REQUESTED
          ] as ContentStage[]).includes(item.stage);

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

    if (message) {
      await this.prisma.contentComment.create({
        data: {
          contentItemId: item.id,
          authorType: "CLIENT",
          authorName: dto.reviewerName?.trim() || "Cliente",
          message,
          visibleToClient: true
        }
      });
    }

    if (!approved && calendar.client.assignedDesignerId) {
      await this.prisma.notification.create({
        data: {
          designerId: calendar.client.assignedDesignerId,
          type: "CHANGE",
          title:
            phase === ApprovalPhase.PLANNING
              ? "Ajuste solicitado no planejamento"
              : "Ajuste solicitado na arte",
          message: `O cliente solicitou alteração em "${item.title}".`,
          link: `/calendars/${calendar.id}`
        }
      });
    }

    if (!approved) {
      await sendWorkflowEmail({
        to: calendar.client.assignedDesigner?.email,
        subject:
          phase === ApprovalPhase.PLANNING
            ? "Ajuste solicitado no planejamento"
            : "Ajuste solicitado na arte",
        lines: [
          `O cliente solicitou alteração em "${item.title}".`,
          message ? `Feedback: ${message}` : "",
          "",
          `Abra o calendário: ${(process.env.APP_URL ?? "http://localhost:4334").replace(/\/$/, "")}/calendars/${calendar.id}`
        ].filter(Boolean)
      });
    }

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

      const calendar = await this.prisma.calendar.findUnique({
        where: { id: calendarId },
        select: {
          title: true,
          client: {
            select: {
              assignedDesignerId: true,
              assignedDesigner: {
                select: {
                  email: true,
                  name: true
                }
              }
            }
          }
        }
      });

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

      if (calendar?.client.assignedDesignerId) {
        await this.prisma.notification.create({
          data: {
            designerId: calendar.client.assignedDesignerId,
            type: "ACTION",
            title: "Pré-calendário aprovado",
            message: `"${calendar.title}" está liberado para produção das artes.`,
            link: `/calendars/${calendarId}`
          }
        });
      }

      await sendWorkflowEmail({
        to: calendar?.client.assignedDesigner?.email,
        subject: `Pré-calendário aprovado · ${calendar?.title ?? "Calendário"}`,
        lines: [
          `Olá, ${calendar?.client.assignedDesigner?.name ?? "designer"}.`,
          "",
          `O pré-calendário "${calendar?.title ?? "Calendário"}" foi aprovado pelo cliente e está liberado para produção.`,
          `Acesse: ${(process.env.APP_URL ?? "http://localhost:4334").replace(/\/$/, "")}/calendars/${calendarId}`
        ]
      });

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

    const managers = await this.prisma.designer.findMany({
      where: {
        active: true,
        role: {
          in: ["ADMIN", "DEV"]
        }
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    if (managers.length > 0) {
      await this.prisma.notification.createMany({
        data: managers.map((manager) => ({
          designerId: manager.id,
          type: "PUBLISHING",
          title: "Artes aprovadas · pronto para programar",
          message: "O calendário foi aprovado e entrou na fila de programação.",
          link: `/calendars/${calendarId}`
        }))
      });
    }

    await Promise.all(
      managers.map((manager) =>
        sendWorkflowEmail({
          to: manager.email,
          subject: "Calendário pronto para programação",
          lines: [
            `Olá, ${manager.name}.`,
            "",
            "Todas as artes do calendário foram aprovadas pelo cliente.",
            `Acesse a fila: ${(process.env.APP_URL ?? "http://localhost:4334").replace(/\/$/, "")}/calendars/${calendarId}`
          ]
        })
      )
    );
  }
}
