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
  const waiting = pieces.filter(
    (item) => item.status === "PENDING_APPROVAL"
  ).length;
  const approved = pieces.filter((item) => item.status === "APPROVED").length;
  const changes = pieces.filter(
    (item) => item.status === "CHANGES_REQUESTED"
  ).length;
  const reviewed = approved + changes;
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

      <section className="dashboard-kpi-grid" aria-label="Resumo da operação">
        <article>
          <span className="dashboard-kpi-icon">
            <FiUsers aria-hidden="true" />
          </span>
          <div>
            <small>Clientes ativos</small>
            <strong>{activeClients.length}</strong>
            <p>{clients.length - activeClients.length} inativo(s)</p>
          </div>
        </article>

        <article>
          <span className="dashboard-kpi-icon">
            <FiCalendar aria-hidden="true" />
          </span>
          <div>
            <small>Calendários ativos</small>
            <strong>{calendars.length}</strong>
            <p>{pieces.length} peça(s) no fluxo</p>
          </div>
        </article>

        <article className="attention">
          <span className="dashboard-kpi-icon">
            <FiClock aria-hidden="true" />
          </span>
          <div>
            <small>Aguardando aprovação</small>
            <strong>{waiting}</strong>
            <p>Conteúdos esperando o cliente</p>
          </div>
        </article>

        <article className="positive">
          <span className="dashboard-kpi-icon">
            <FiCheckCircle aria-hidden="true" />
          </span>
          <div>
            <small>Aprovadas</small>
            <strong>{approved}</strong>
            <p>{approvalRate}% das decisões foram aprovação</p>
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
                  ? latest.contentItems.filter(
                      (item) => item.status === "PENDING_APPROVAL"
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
              <p>Visão rápida das decisões dos clientes.</p>
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
              <p>Aguardando aprovação</p>
              <strong>{waiting}</strong>
            </div>
            <div>
              <span className="status-dot approved" />
              <p>Aprovadas</p>
              <strong>{approved}</strong>
            </div>
            <div>
              <span className="status-dot changes" />
              <p>Com alteração solicitada</p>
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
              const pending = calendar.contentItems.filter(
                (item) => item.status === "PENDING_APPROVAL"
              ).length;
              const approvedItems = calendar.contentItems.filter(
                (item) => item.status === "APPROVED"
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
                    <small>Peças</small>
                    <strong>{calendar.contentItems.length}</strong>
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
