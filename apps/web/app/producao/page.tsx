import Link from "next/link";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiLayers,
  FiRefreshCw,
  FiTool
} from "react-icons/fi";
import { AppShell } from "../../components/app-shell";
import {
  OperationalKanban,
  type OperationalKanbanCard
} from "../../components/operational-kanban";
import { requireDesigner } from "../../lib/auth";
import {
  getAccessibleClients,
  getDesigners,
  getStandaloneArtworks
} from "../../lib/api";

function calendarColumn(stage: string): OperationalKanbanCard["column"] | null {
  if (stage === "DESIGN_PENDING") return "WAITING";
  if (stage === "DESIGN_IN_PROGRESS") return "PRODUCTION";
  if (stage === "ART_APPROVAL_PENDING") return "APPROVAL";
  if (stage === "ART_CHANGES_REQUESTED") return "CHANGES";
  if (
    ["ART_APPROVED", "READY_TO_SCHEDULE", "SCHEDULED", "PUBLISHED"].includes(
      stage
    )
  ) {
    return "DONE";
  }
  return null;
}

function calendarStatus(stage: string) {
  if (stage === "DESIGN_PENDING") return "Aguardando produção";
  if (stage === "DESIGN_IN_PROGRESS") return "Em produção";
  if (stage === "ART_APPROVAL_PENDING") return "Em aprovação";
  if (stage === "ART_CHANGES_REQUESTED") return "Ajuste solicitado";
  if (stage === "ART_APPROVED") return "Arte aprovada";
  if (stage === "READY_TO_SCHEDULE") return "Pronta para agendar";
  if (stage === "SCHEDULED") return "Agendada";
  if (stage === "PUBLISHED") return "Publicada";
  return stage;
}

function standaloneColumn(
  status: string
): OperationalKanbanCard["column"] | null {
  if (status === "REQUESTED") return "WAITING";
  if (status === "IN_PRODUCTION") return "PRODUCTION";
  if (status === "IN_APPROVAL" || status === "APPROVED") return "APPROVAL";
  if (status === "CHANGES_REQUESTED") return "CHANGES";
  if (status === "DELIVERED") return "DONE";
  return null;
}

function standaloneStatus(status: string) {
  if (status === "REQUESTED") return "Solicitada";
  if (status === "IN_PRODUCTION") return "Em produção";
  if (status === "IN_APPROVAL") return "Em aprovação";
  if (status === "CHANGES_REQUESTED") return "Ajuste solicitado";
  if (status === "APPROVED") return "Aprovada";
  if (status === "DELIVERED") return "Entregue";
  return status;
}

function deadlineState(value: string | null) {
  if (!value) return "no-deadline";
  const diff = new Date(value).getTime() - Date.now();
  const hours = Math.ceil(diff / (60 * 60 * 1000));
  if (hours < 0) return "overdue";
  if (hours <= 24) return "risk";
  return "on-time";
}

function isCurrentMonth(value: string | null) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

export default async function ProductionPage({
  searchParams
}: {
  searchParams: Promise<{
    client?: string;
    designer?: string;
    source?: string;
    sla?: string;
  }>;
}) {
  const designer = await requireDesigner();
  const filters = await searchParams;

  const [clients, standalone, designers] = await Promise.all([
    getAccessibleClients(designer),
    getStandaloneArtworks(),
    designer.role === "DESIGNER" ? Promise.resolve([]) : getDesigners()
  ]);

  const calendarCards: OperationalKanbanCard[] = clients.flatMap((client) =>
    client.calendars
      .filter((calendar) => !calendar.archivedAt)
      .flatMap((calendar) =>
        calendar.contentItems.flatMap((item) => {
          const column = calendarColumn(item.stage);
          if (!column) return [];

          if (
            column === "DONE" &&
            !isCurrentMonth(item.artworkApprovedAt ?? item.publishedAt)
          ) {
            return [];
          }

          return [
            {
              id: item.id,
              source: "calendar",
              calendarId: calendar.id,
              clientName: client.name,
              context: calendar.title,
              title: item.title,
              status: calendarStatus(item.stage),
              column,
              points: item.effortPoints || 1,
              quantity: 1,
              dueAt: calendar.artworkDueAt,
              href: `/calendars/${calendar.id}/content/${item.id}/artwork`,
              movable: [
                "DESIGN_PENDING",
                "DESIGN_IN_PROGRESS",
                "ART_CHANGES_REQUESTED"
              ].includes(item.stage)
            }
          ];
        })
      )
  );

  const standaloneCards: OperationalKanbanCard[] = standalone.flatMap(
    (artwork) => {
      const column = standaloneColumn(artwork.status);
      if (!column) return [];

      if (
        column === "DONE" &&
        !isCurrentMonth(artwork.completedAt ?? artwork.updatedAt)
      ) {
        return [];
      }

      return [
        {
          id: artwork.id,
          source: "standalone",
          clientName: artwork.client.name,
          context: "Arte avulsa",
          title: artwork.title,
          status: standaloneStatus(artwork.status),
          column,
          points: artwork.effortPoints,
          quantity: artwork.quantity,
          dueAt: artwork.dueAt,
          href: "/artes-avulsas",
          priority: artwork.priority,
          nextcloudPath: artwork.nextcloudPath,
          movable: artwork.status !== "DELIVERED"
        }
      ];
    }
  );

  const cards = [...calendarCards, ...standaloneCards].filter((card) => {
    const client = clients.find((item) => item.name === card.clientName);
    const standaloneItem =
      card.source === "standalone"
        ? standalone.find((item) => item.id === card.id)
        : null;
    const calendarItem =
      card.source === "calendar"
        ? clients
            .flatMap((item) => item.calendars)
            .flatMap((calendar) => calendar.contentItems)
            .find((item) => item.id === card.id)
        : null;
    const ownerId =
      standaloneItem?.designerId ??
      calendarItem?.productionDesignerId ??
      client?.assignedDesignerId ??
      null;

    if (filters.client && client?.id !== filters.client) return false;
    if (filters.designer && ownerId !== filters.designer) return false;
    if (filters.source && card.source !== filters.source) return false;
    if (filters.sla && deadlineState(card.dueAt) !== filters.sla) return false;
    return true;
  });

  const overdue = cards.filter(
    (card) => deadlineState(card.dueAt) === "overdue" && card.column !== "DONE"
  ).length;
  const risk = cards.filter(
    (card) => deadlineState(card.dueAt) === "risk" && card.column !== "DONE"
  ).length;
  const changes = cards.filter((card) => card.column === "CHANGES").length;
  const activePoints = cards
    .filter((card) => card.column !== "DONE")
    .reduce((sum, card) => sum + card.points, 0);

  return (
    <AppShell designer={designer} activeSection="production">
      <header className="page-header production-page-header">
        <div>
          <span className="micro-label">CENTRAL OPERACIONAL</span>
          <h1>Central de demandas</h1>
          <p>
            Arraste demandas pelo fluxo de trabalho, acompanhe SLA e mantenha
            calendário e artes avulsas na mesma operação.
          </p>
        </div>
      </header>

      <section className="production-summary">
        <article className={overdue ? "danger" : ""}>
          <FiAlertCircle aria-hidden="true" />
          <div><small>Atrasadas</small><strong>{overdue}</strong></div>
        </article>
        <article>
          <FiClock aria-hidden="true" />
          <div><small>Em risco (24h)</small><strong>{risk}</strong></div>
        </article>
        <article className={changes ? "danger" : ""}>
          <FiRefreshCw aria-hidden="true" />
          <div><small>Ajustes</small><strong>{changes}</strong></div>
        </article>
        <article className="success">
          <FiTool aria-hidden="true" />
          <div><small>Pontos ativos</small><strong>{activePoints}</strong></div>
        </article>
      </section>

      <form className="demand-filters" method="get">
        <label>
          <span>Cliente</span>
          <select name="client" defaultValue={filters.client ?? ""}>
            <option value="">Todos</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
        </label>

        {designer.role !== "DESIGNER" ? (
          <label>
            <span>Designer</span>
            <select name="designer" defaultValue={filters.designer ?? ""}>
              <option value="">Todos</option>
              {designers.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
        ) : null}

        <label>
          <span>Origem</span>
          <select name="source" defaultValue={filters.source ?? ""}>
            <option value="">Todas</option>
            <option value="calendar">Calendário</option>
            <option value="standalone">Arte avulsa</option>
          </select>
        </label>

        <label>
          <span>SLA</span>
          <select name="sla" defaultValue={filters.sla ?? ""}>
            <option value="">Todos</option>
            <option value="overdue">Atrasadas</option>
            <option value="risk">Em risco</option>
            <option value="on-time">No prazo</option>
            <option value="no-deadline">Sem prazo</option>
          </select>
        </label>

        <button className="button button-dark" type="submit">Filtrar</button>
        <Link className="button button-ghost" href="/producao">Limpar</Link>
      </form>

      <div className="demand-source-legend">
        <span><FiLayers /> Calendário: {calendarCards.length}</span>
        <span>Avulsas: {standaloneCards.length}</span>
        <span><FiCheckCircle /> Exibindo: {cards.length}</span>
      </div>

      <OperationalKanban initialCards={cards} />
    </AppShell>
  );
}
