import Link from "next/link";
import type { CSSProperties } from "react";
import {
  FiAlertCircle,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
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

function compactDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  })
    .format(new Date(value))
    .replace(".", "");
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
  const approved = pieces.filter((item) =>
    [
      "ART_APPROVED",
      "READY_TO_SCHEDULE",
      "SCHEDULED",
      "PUBLISHED"
    ].includes(item.stage)
  ).length;
  const changes = pieces.filter((item) =>
    ["PRE_CHANGES_REQUESTED", "ART_CHANGES_REQUESTED"].includes(item.stage)
  ).length;
  const reviewed = pieces.filter((item) =>
    [
      "ART_APPROVED",
      "READY_TO_SCHEDULE",
      "SCHEDULED",
      "PUBLISHED",
      "ART_CHANGES_REQUESTED"
    ].includes(item.stage)
  ).length;
  const approvalRate =
    reviewed > 0 ? Math.round((approved / reviewed) * 100) : 0;

  const recentCalendars = activeClients
    .flatMap((client) =>
      client.calendars
        .filter((calendar) => !calendar.archivedAt)
        .map((calendar) => ({ client, calendar }))
    )
    .sort(
      (a, b) =>
        new Date(b.calendar.periodStart).getTime() -
        new Date(a.calendar.periodStart).getTime()
    )
    .slice(0, 5);

  return (
    <AppShell designer={designer} activeSection="panel">
      <header className="page-header dashboard-header">
        <div>
          <span className="micro-label">PAINEL</span>
          <h1>
            {designer.role === "DESIGNER" ? "Seus clientes" : "Visão geral"}
          </h1>
          <p>
            {designer.role === "DESIGNER"
              ? "Acompanhe seus clientes, os conteúdos em revisão e os calendários em andamento."
              : "Acompanhe a operação, os calendários ativos e o fluxo de aprovações."}
          </p>
        </div>

        {designer.role === "DESIGNER" ? (
          <Link href="/calendars" className="button button-dark">
            Ver calendários
          </Link>
        ) : (
          <Link href="/clients/new" className="button button-primary">
            + Novo cliente
          </Link>
        )}
      </header>

      <section className="dashboard-kpi-grid" aria-label="Esteira da operação">
        <article>
          <span className="dashboard-kpi-icon">
            <FiClock aria-hidden="true" />
          </span>
          <div>
            <small>Pré-aprovação</small>
            <strong>{preApproval}</strong>
            <p>Briefings aguardando o cliente</p>
          </div>
        </article>

        <article>
          <span className="dashboard-kpi-icon">
            <FiCalendar aria-hidden="true" />
          </span>
          <div>
            <small>Em produção</small>
            <strong>{production}</strong>
            <p>Peças na fila do design</p>
          </div>
        </article>

        <article className="attention">
          <span className="dashboard-kpi-icon">
            <FiAlertCircle aria-hidden="true" />
          </span>
          <div>
            <small>Aprovação de arte</small>
            <strong>{artApproval}</strong>
            <p>Artes esperando o cliente</p>
          </div>
        </article>

        <article className="positive">
          <span className="dashboard-kpi-icon">
            <FiCheckCircle aria-hidden="true" />
          </span>
          <div>
            <small>Prontos para programar</small>
            <strong>{readyToSchedule}</strong>
            <p>Fila preparada para mLabs</p>
          </div>
        </article>
      </section>

      <section className="dashboard-main-grid">
        <div className="dashboard-panel dashboard-clients-panel">
          <div className="dashboard-panel-heading">
            <div>
              <span className="micro-label">CARTEIRA</span>
              <h2>Clientes</h2>
              <p>Atalhos para os clientes em acompanhamento.</p>
            </div>
            <Link href="/clients">
              Ver todos
              <FiArrowRight aria-hidden="true" />
            </Link>
          </div>

          {activeClients.length === 0 ? (
            <div className="dashboard-empty">
              <FiUsers aria-hidden="true" />
              <strong>Nenhum cliente ativo</strong>
              <p>Cadastre ou reative um cliente para iniciar a operação.</p>
            </div>
          ) : (
            <div className="dashboard-client-list">
              {activeClients.slice(0, 4).map((client) => {
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
                    className="dashboard-client-row"
                    key={client.id}
                  >
                    <span className="dashboard-client-avatar">
                      {clientInitials(client.name) || "TA"}
                    </span>
                    <div>
                      <strong>{client.name}</strong>
                      <small>
                        {client.assignedDesigner
                          ? client.assignedDesigner.name
                          : "Sem responsável"}
                      </small>
                    </div>
                    <div className="dashboard-client-calendar">
                      <small>Último calendário</small>
                      <strong>
                        {latest
                          ? calendarLabel(latest.periodStart)
                          : "Ainda não criado"}
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
                    <FiArrowRight aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <aside className="dashboard-panel dashboard-approval-panel">
          <div className="dashboard-panel-heading">
            <div>
              <span className="micro-label">APROVAÇÕES</span>
              <h2>Fluxo de revisão</h2>
              <p>Visão rápida da esteira de aprovação e produção.</p>
            </div>
          </div>

          <div className="dashboard-approval-score">
            <div>
              <strong>{approvalRate}%</strong>
              <span>taxa de aprovação</span>
            </div>
            <div
              className="dashboard-approval-ring"
              style={
                {
                  "--approval-rate": `${approvalRate * 3.6}deg`
                } as CSSProperties
              }
              aria-label={`${approvalRate}% de aprovação`}
            >
              <span>{reviewed}</span>
            </div>
          </div>

          <div className="dashboard-status-list">
            <div>
              <span className="status-dot waiting" />
              <p>Pré-calendário em aprovação</p>
              <strong>{preApproval}</strong>
            </div>
            <div>
              <span className="status-dot approved" />
              <p>Artes em aprovação</p>
              <strong>{artApproval}</strong>
            </div>
            <div>
              <span className="status-dot changes" />
              <p>Alterações solicitadas</p>
              <strong>{changes}</strong>
            </div>
          </div>

          <Link href="/calendars" className="dashboard-panel-link">
            Abrir calendários
            <FiArrowRight aria-hidden="true" />
          </Link>
        </aside>
      </section>

      <section className="dashboard-panel dashboard-calendar-panel">
        <div className="dashboard-panel-heading">
          <div>
            <span className="micro-label">ATIVIDADE</span>
            <h2>Calendários recentes</h2>
            <p>Os planejamentos ativos mais recentes da operação.</p>
          </div>
          <Link href="/calendars">
            Ver calendários
            <FiArrowRight aria-hidden="true" />
          </Link>
        </div>

        {recentCalendars.length === 0 ? (
          <div className="dashboard-empty compact">
            <FiCalendar aria-hidden="true" />
            <strong>Nenhum calendário ativo</strong>
          </div>
        ) : (
          <div className="dashboard-calendar-list">
            {recentCalendars.map(({ client, calendar }) => {
              const pending = calendar.contentItems.filter((item) =>
                [
                  "PRE_APPROVAL_PENDING",
                  "ART_APPROVAL_PENDING"
                ].includes(item.stage)
              ).length;
              const approvedItems = calendar.contentItems.filter((item) =>
                [
                  "ART_APPROVED",
                  "READY_TO_SCHEDULE",
                  "SCHEDULED",
                  "PUBLISHED"
                ].includes(item.stage)
              ).length;

              return (
                <Link
                  href={`/calendars/${calendar.id}`}
                  className="dashboard-calendar-row"
                  key={calendar.id}
                >
                  <span className="dashboard-calendar-icon">
                    <FiCalendar aria-hidden="true" />
                  </span>
                  <div className="dashboard-calendar-copy">
                    <strong>{calendar.title}</strong>
                    <small>
                      {client.name} · {compactDate(calendar.periodStart)}
                    </small>
                  </div>
                  <div className="dashboard-calendar-stat">
                    <small>Etapa</small>
                    <strong>{calendar.stage.replaceAll("_", " ")}</strong>
                  </div>
                  <div className="dashboard-calendar-stat">
                    <small>Pendentes</small>
                    <strong>{pending}</strong>
                  </div>
                  <div className="dashboard-calendar-stat">
                    <small>Aprovadas</small>
                    <strong>{approvedItems}</strong>
                  </div>
                  <FiArrowRight className="dashboard-calendar-arrow" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
