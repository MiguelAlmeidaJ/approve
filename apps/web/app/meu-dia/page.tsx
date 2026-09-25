import Link from "next/link";
import {
  FiAlertCircle,
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiEdit3,
  FiSend,
  FiTool
} from "react-icons/fi";
import { AppShell } from "../../components/app-shell";
import { requireDesigner } from "../../lib/auth";
import { getAccessibleClients, type Calendar, type ContentItem } from "../../lib/api";

type Task = {
  id: string;
  client: string;
  calendar: Calendar;
  item?: ContentItem;
  title: string;
  detail: string;
  href: string;
  dueAt: string | null;
  priority: number;
  kind: "change" | "production" | "approval" | "scheduling" | "planning";
};

function dueFor(calendar: Calendar) {
  if (calendar.stage === "PLANNING") return calendar.planningDueAt;
  if (calendar.stage === "PRE_APPROVAL") return calendar.planningApprovalDueAt;
  if (calendar.stage === "PRODUCTION") return calendar.artworkDueAt;
  if (calendar.stage === "FINAL_APPROVAL") return calendar.artworkApprovalDueAt;
  if (calendar.stage === "SCHEDULING") return calendar.schedulingDueAt;
  return null;
}

function dueMeta(value: string | null) {
  if (!value) return { label: "Sem prazo", overdue: false, soon: false };
  const due = new Date(value);
  const now = new Date();
  const diff = Math.ceil((due.getTime() - now.getTime()) / 86400000);

  if (diff < 0) {
    return {
      label: `${Math.abs(diff)} dia(s) atrasado`,
      overdue: true,
      soon: true
    };
  }

  if (diff === 0) return { label: "Hoje", overdue: false, soon: true };
  if (diff === 1) return { label: "Amanhã", overdue: false, soon: true };

  return {
    label: new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      timeZone: "UTC"
    }).format(due),
    overdue: false,
    soon: diff <= 3
  };
}

export default async function MyDayPage() {
  const designer = await requireDesigner();
  const clients = await getAccessibleClients(designer);
  const manager = designer.role === "ADMIN" || designer.role === "DEV";
  const tasks: Task[] = [];

  for (const client of clients) {
    for (const calendar of client.calendars) {
      if (calendar.archivedAt || ["COMPLETED", "ARCHIVED"].includes(calendar.stage)) {
        continue;
      }

      const dueAt = dueFor(calendar);
      const due = dueMeta(dueAt);

      if (manager && calendar.stage === "PLANNING") {
        const unfinished = calendar.contentItems.filter((item) => !item.planningReady);
        tasks.push({
          id: `planning-${calendar.id}`,
          client: client.name,
          calendar,
          title: unfinished.length
            ? `Finalizar ${unfinished.length} briefing(s)`
            : "Revisar pré-calendário",
          detail: "Próxima ação: equipe interna",
          href: `/calendars/${calendar.id}`,
          dueAt,
          priority: due.overdue ? 0 : due.soon ? 2 : 5,
          kind: "planning"
        });
      }

      if (manager && calendar.stage === "PRE_APPROVAL" && due.overdue) {
        tasks.push({
          id: `pre-followup-${calendar.id}`,
          client: client.name,
          calendar,
          title: "Cobrar aprovação do pré-calendário",
          detail: "Próxima ação: cliente",
          href: `/calendars/${calendar.id}`,
          dueAt,
          priority: 0,
          kind: "approval"
        });
      }

      if (calendar.stage === "PRODUCTION") {
        for (const item of calendar.contentItems) {
          if (
            !["DESIGN_PENDING", "DESIGN_IN_PROGRESS", "ART_CHANGES_REQUESTED"].includes(
              item.stage
            )
          ) {
            continue;
          }

          tasks.push({
            id: item.id,
            client: client.name,
            calendar,
            item,
            title:
              item.stage === "ART_CHANGES_REQUESTED"
                ? `Ajustar: ${item.title}`
                : `Produzir: ${item.title}`,
            detail:
              item.stage === "ART_CHANGES_REQUESTED"
                ? "Cliente solicitou alteração"
                : "Próxima ação: designer",
            href: `/calendars/${calendar.id}/content/${item.id}/artwork`,
            dueAt,
            priority:
              item.stage === "ART_CHANGES_REQUESTED"
                ? 0
                : due.overdue
                  ? 1
                  : due.soon
                    ? 2
                    : 4,
            kind:
              item.stage === "ART_CHANGES_REQUESTED" ? "change" : "production"
          });
        }
      }

      if (manager && calendar.stage === "FINAL_APPROVAL" && due.overdue) {
        tasks.push({
          id: `final-followup-${calendar.id}`,
          client: client.name,
          calendar,
          title: "Cobrar aprovação das artes",
          detail: "Próxima ação: cliente",
          href: `/calendars/${calendar.id}`,
          dueAt,
          priority: 0,
          kind: "approval"
        });
      }

      if (manager && calendar.stage === "SCHEDULING") {
        for (const item of calendar.contentItems) {
          if (!["READY_TO_SCHEDULE", "SCHEDULING_ERROR"].includes(item.stage)) {
            continue;
          }
          tasks.push({
            id: `schedule-${item.id}`,
            client: client.name,
            calendar,
            item,
            title:
              item.stage === "SCHEDULING_ERROR"
                ? `Corrigir programação: ${item.title}`
                : `Programar: ${item.title}`,
            detail:
              item.stage === "SCHEDULING_ERROR"
                ? item.publishingError || "Erro na programação"
                : "Próxima ação: operação",
            href: `/calendars/${calendar.id}`,
            dueAt,
            priority:
              item.stage === "SCHEDULING_ERROR" || due.overdue ? 0 : due.soon ? 2 : 4,
            kind: "scheduling"
          });
        }
      }
    }
  }

  tasks.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const at = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bt = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    return at - bt;
  });

  const urgent = tasks.filter((task) => task.priority <= 1).length;
  const changes = tasks.filter((task) => task.kind === "change").length;
  const production = tasks.filter((task) => task.kind === "production").length;
  const scheduling = tasks.filter((task) => task.kind === "scheduling").length;

  const iconFor = (kind: Task["kind"]) => {
    if (kind === "change") return FiEdit3;
    if (kind === "production") return FiTool;
    if (kind === "scheduling") return FiSend;
    if (kind === "approval") return FiClock;
    return FiCheckCircle;
  };

  return (
    <AppShell designer={designer} activeSection="today">
      <header className="page-header my-day-header">
        <div>
          <span className="micro-label">FOCO OPERACIONAL</span>
          <h1>Meu dia</h1>
          <p>
            Uma fila única com o que precisa acontecer agora, ordenada por urgência.
          </p>
        </div>
      </header>

      <section className="my-day-summary">
        <article className={urgent ? "danger" : ""}>
          <FiAlertCircle />
          <div><small>Urgentes</small><strong>{urgent}</strong></div>
        </article>
        <article>
          <FiEdit3 />
          <div><small>Alterações</small><strong>{changes}</strong></div>
        </article>
        <article>
          <FiTool />
          <div><small>Produção</small><strong>{production}</strong></div>
        </article>
        <article>
          <FiSend />
          <div><small>Programação</small><strong>{scheduling}</strong></div>
        </article>
      </section>

      {tasks.length === 0 ? (
        <div className="my-day-empty">
          <FiCheckCircle />
          <strong>Nada pendente para você agora.</strong>
          <p>A operação está em dia com base nas etapas e prazos cadastrados.</p>
        </div>
      ) : (
        <section className="my-day-list">
          {tasks.map((task, index) => {
            const Icon = iconFor(task.kind);
            const due = dueMeta(task.dueAt);
            return (
              <Link
                href={task.href}
                className={due.overdue ? "my-day-task overdue" : "my-day-task"}
                key={`${task.id}-${index}`}
              >
                <span className="my-day-task-icon"><Icon /></span>
                <div className="my-day-task-copy">
                  <span>{task.client} · {task.calendar.title}</span>
                  <strong>{task.title}</strong>
                  <small>{task.detail}</small>
                </div>
                <div className={due.overdue ? "my-day-due overdue" : "my-day-due"}>
                  <FiClock />
                  <span>{due.label}</span>
                </div>
                <FiArrowRight className="my-day-arrow" />
              </Link>
            );
          })}
        </section>
      )}
    </AppShell>
  );
}
