import Link from "next/link";
import {
  FiAlertCircle,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiTool,
  FiUsers
} from "react-icons/fi";
import { AppShell } from "../components/app-shell";
import { requireDesigner } from "../lib/auth";
import { getAccessibleClients } from "../lib/api";

function calendarLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(value));
}

function stageDeadline(calendar: {
  stage: string;
  planningDueAt: string | null;
  planningApprovalDueAt: string | null;
  artworkDueAt: string | null;
  artworkApprovalDueAt: string | null;
  schedulingDueAt: string | null;
}) {
  if (calendar.stage === "PLANNING") return calendar.planningDueAt;
  if (calendar.stage === "PRE_APPROVAL") return calendar.planningApprovalDueAt;
  if (calendar.stage === "PRODUCTION") return calendar.artworkDueAt;
  if (calendar.stage === "FINAL_APPROVAL") return calendar.artworkApprovalDueAt;
  if (calendar.stage === "SCHEDULING") return calendar.schedulingDueAt;
  return null;
}

function stageName(stage: string) {
  return {
    PLANNING: "Pré-calendário",
    PRE_APPROVAL: "Aprovação do planejamento",
    PRODUCTION: "Produção das artes",
    FINAL_APPROVAL: "Aprovação das artes",
    SCHEDULING: "Programação"
  }[stage] ?? stage;
}

function clientInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function DashboardPage() {
  const designer = await requireDesigner();
  const clients = await getAccessibleClients(designer);
  const activeClients = clients.filter((client) => client.active);
  const calendars = activeClients.flatMap((client) =>
    client.calendars.filter((calendar) => !calendar.archivedAt)
  );
  const pieces = calendars.flatMap((calendar) => calendar.contentItems);

  const preApproval = pieces.filter(
    (item) => item.stage === "PRE_APPROVAL_PENDING"
  ).length;
  const production = pieces.filter((item) =>
    [
      "DESIGN_PENDING",
      "DESIGN_IN_PROGRESS",
      "ART_CHANGES_REQUESTED"
    ].includes(item.stage)
  ).length;
  const artApproval = pieces.filter(
    (item) => item.stage === "ART_APPROVAL_PENDING"
  ).length;
  const readyToSchedule = pieces.filter((item) =>
    ["READY_TO_SCHEDULE", "SCHEDULING_ERROR"].includes(item.stage)
  ).length;
  const requestedChanges = pieces.filter((item) =>
    ["PRE_CHANGES_REQUESTED", "ART_CHANGES_REQUESTED"].includes(item.stage)
  ).length;

  const operations = activeClients.flatMap((client) =>
    client.calendars
      .filter(
        (calendar) =>
          !calendar.archivedAt &&
          !["COMPLETED", "ARCHIVED"].includes(calendar.stage)
      )
      .map((calendar) => ({
        client,
        calendar,
        dueAt: stageDeadline(calendar)
      }))
  );

  const now = Date.now();
  const overdue = operations.filter(
    ({ dueAt }) => dueAt && new Date(dueAt).getTime() < now
  );
  const upcoming = operations
    .filter(({ dueAt }) => dueAt)
    .sort(
      (a, b) =>
        new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime()
    )
    .slice(0, 4);

  const urgentTotal = overdue.length + requestedChanges;
  const clientWaiting = preApproval + artApproval;

  const priorityItems = [
    {
      label: "Prazos vencidos",
      value: overdue.length,
      description: "Etapas que já passaram do prazo",
      href: "/calendars",
      tone: overdue.length > 0 ? "danger" : "neutral",
      icon: FiAlertCircle
    },
    {
      label: "Em produção",
      value: production,
      description: "Peças na fila do design",
      href: "/producao",
      tone: "neutral",
      icon: FiTool
    },
    {
      label: "Aguardando cliente",
      value: clientWaiting,
      description: "Planejamentos e artes em aprovação",
      href: "/calendars",
      tone: clientWaiting > 0 ? "warning" : "neutral",
      icon: FiClock
    },
    {
      label: "Prontos para programar",
      value: readyToSchedule,
      description: "Conteúdos liberados para programação",
      href: "/calendars",
      tone: "success",
      icon: FiCheckCircle
    }
  ];

  return (
    <AppShell designer={designer} activeSection="panel">
      <header className="page-header dashboard-header dashboard-header-clean">
        <div>
          <span className="micro-label">PAINEL</span>
          <h1>
            {designer.role === "DESIGNER" ? "Seu dia" : "Visão geral"}
          </h1>
          <p>
            O que precisa de atenção agora e os principais atalhos da operação.
          </p>
        </div>

        {designer.role === "DESIGNER" ? (
          <Link href="/producao" className="button button-dark">
            Abrir minhas demandas
          </Link>
        ) : (
          <Link href="/clients/new" className="button button-primary">
            + Novo cliente
          </Link>
        )}
      </header>

      <section className="dashboard-overview-clean" aria-label="Resumo da operação">
        <article className={urgentTotal > 0 ? "danger" : ""}>
          <div>
            <span>Precisa de atenção</span>
            <strong>{urgentTotal}</strong>
          </div>
          <p>
            {overdue.length} prazo(s) vencido(s) · {requestedChanges} ajuste(s)
          </p>
        </article>

        <article>
          <div>
            <span>Em produção</span>
            <strong>{production}</strong>
          </div>
          <p>Peças ativas na fila de design</p>
        </article>

        <article>
          <div>
            <span>Aguardando cliente</span>
            <strong>{clientWaiting}</strong>
          </div>
          <p>Aprovações de planejamento e arte</p>
        </article>
      </section>

      <section className="dashboard-focus-grid">
        <div className="dashboard-focus-panel">
          <div className="dashboard-focus-head">
            <div>
              <span className="micro-label">AGORA</span>
              <h2>Prioridades de hoje</h2>
            </div>
            <Link href="/producao">
              Central de demandas
              <FiArrowRight aria-hidden="true" />
            </Link>
          </div>

          <div className="dashboard-priority-list">
            {priorityItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  href={item.href}
                  className={`dashboard-priority-item ${item.tone}`}
                  key={item.label}
                >
                  <span className="dashboard-priority-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </div>
                  <b>{item.value}</b>
                  <FiArrowRight aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </div>

        <aside className="dashboard-focus-panel dashboard-deadline-panel">
          <div className="dashboard-focus-head">
            <div>
              <span className="micro-label">PRAZOS</span>
              <h2>Próximos</h2>
            </div>
            <Link href="/calendars">
              Ver calendários
              <FiArrowRight aria-hidden="true" />
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <div className="dashboard-simple-empty">
              <FiClock aria-hidden="true" />
              <span>Nenhum prazo próximo.</span>
            </div>
          ) : (
            <div className="dashboard-deadline-list-clean">
              {upcoming.map(({ client, calendar, dueAt }) => {
                const date = new Date(dueAt!);
                const isOverdue = date.getTime() < now;
                return (
                  <Link
                    href={`/calendars/${calendar.id}`}
                    className={isOverdue ? "overdue" : ""}
                    key={calendar.id}
                  >
                    <div>
                      <strong>{client.name}</strong>
                      <small>{stageName(calendar.stage)}</small>
                    </div>
                    <time dateTime={dueAt!}>
                      {new Intl.DateTimeFormat("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        timeZone: "UTC"
                      }).format(date)}
                    </time>
                  </Link>
                );
              })}
            </div>
          )}
        </aside>
      </section>

      <section className="dashboard-focus-panel dashboard-clients-clean">
        <div className="dashboard-focus-head">
          <div>
            <span className="micro-label">CARTEIRA</span>
            <h2>Clientes em acompanhamento</h2>
          </div>
          <Link href="/clients">
            Ver todos
            <FiArrowRight aria-hidden="true" />
          </Link>
        </div>

        {activeClients.length === 0 ? (
          <div className="dashboard-simple-empty">
            <FiUsers aria-hidden="true" />
            <span>Nenhum cliente ativo.</span>
          </div>
        ) : (
          <div className="dashboard-client-grid-clean">
            {activeClients.slice(0, 6).map((client) => {
              const latest = [...client.calendars]
                .filter((calendar) => !calendar.archivedAt)
                .sort(
                  (a, b) =>
                    new Date(b.periodStart).getTime() -
                    new Date(a.periodStart).getTime()
                )[0];

              const pending = latest
                ? latest.contentItems.filter((item) =>
                    [
                      "PRE_APPROVAL_PENDING",
                      "ART_APPROVAL_PENDING",
                      "PRE_CHANGES_REQUESTED",
                      "ART_CHANGES_REQUESTED"
                    ].includes(item.stage)
                  ).length
                : 0;

              return (
                <Link
                  href={`/clients/${client.id}`}
                  className="dashboard-client-card-clean"
                  key={client.id}
                >
                  <span className="dashboard-client-avatar">
                    {clientInitials(client.name) || "TA"}
                  </span>
                  <div>
                    <strong>{client.name}</strong>
                    <small>
                      {client.assignedDesigner?.name ?? "Sem responsável"}
                    </small>
                  </div>
                  <div className="dashboard-client-last">
                    <small>Calendário</small>
                    <strong>
                      {latest ? calendarLabel(latest.periodStart) : "Sem calendário"}
                    </strong>
                  </div>
                  <span
                    className={
                      pending > 0
                        ? "dashboard-pending-badge"
                        : "dashboard-pending-badge clear"
                    }
                  >
                    {pending > 0 ? `${pending} pendente(s)` : "Em dia"}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
