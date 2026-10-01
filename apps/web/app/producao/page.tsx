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
  getStandaloneArtworks,
  type Client,
  type StandaloneArtwork
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

function contractExtras(
  clients: Client[],
  standalone: StandaloneArtwork[]
): Map<string, string[]> {
  const result = new Map<string, string[]>();

  for (const client of clients) {
    const entries: Array<{
      key: string;
      date: string;
      points: number;
      quantity: number;
      kind: "calendar" | "standalone";
      contentType?: "POST" | "CAROUSEL" | "REEL" | "STORY";
    }> = [];

    for (const calendar of client.calendars) {
      for (const item of calendar.contentItems) {
        if (!isCurrentMonth(item.scheduledAt)) continue;
        entries.push({
          key: `calendar:${item.id}`,
          date: item.scheduledAt,
          points: item.effortPoints || 1,
          quantity: 1,
          kind: "calendar",
          contentType: item.contentType
        });
      }
    }

    for (const artwork of standalone) {
      if (
        artwork.clientId !== client.id ||
        artwork.status === "CANCELLED" ||
        !isCurrentMonth(artwork.createdAt)
      ) {
        continue;
      }

      const outputs =
        artwork.outputs.length > 0
          ? artwork.outputs
          : [
              {
                contentType: artwork.contentType,
                quantity: artwork.quantity
              }
            ];

      entries.push({
        key: `standalone:${artwork.id}`,
        date: artwork.createdAt,
        points: artwork.effortPoints,
        quantity: outputs.reduce((sum, output) => sum + output.quantity, 0),
        kind: "standalone"
      });

      for (const output of outputs) {
        entries.push({
          key: `standalone-type:${artwork.id}:${output.contentType}`,
          date: artwork.createdAt,
          points: 0,
          quantity: output.quantity,
          kind: "standalone",
          contentType: output.contentType
        });
      }
    }

    entries.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let posts = 0;
    let carousels = 0;
    let reels = 0;
    let stories = 0;
    let standalonePieces = 0;
    let points = 0;

    for (const entry of entries) {
      const reasons: string[] = [];
      points += entry.points;

      if (
        client.monthlyPointsLimit !== null &&
        points > client.monthlyPointsLimit
      ) {
        reasons.push("Pontos mensais excedidos");
      }

      if (entry.kind === "standalone" && !entry.contentType) {
        standalonePieces += entry.quantity;
        if (
          client.monthlyStandaloneLimit !== null &&
          standalonePieces > client.monthlyStandaloneLimit
        ) {
          reasons.push("Artes avulsas acima da franquia");
        }
      }

      if (entry.contentType === "POST") {
        posts += 1;
        if (
          client.monthlyPostLimit !== null &&
          posts > client.monthlyPostLimit
        ) {
          reasons.push("Posts acima da franquia");
        }
      } else if (entry.contentType === "CAROUSEL") {
        carousels += 1;
        if (
          client.monthlyCarouselLimit !== null &&
          carousels > client.monthlyCarouselLimit
        ) {
          reasons.push("Carrosséis acima da franquia");
        }
      } else if (entry.contentType === "REEL") {
        reels += 1;
        if (
          client.monthlyReelLimit !== null &&
          reels > client.monthlyReelLimit
        ) {
          reasons.push("Reels acima da franquia");
        }
      } else if (entry.contentType === "STORY") {
        stories += 1;
        if (
          client.monthlyStoryLimit !== null &&
          stories > client.monthlyStoryLimit
        ) {
          reasons.push("Stories acima da franquia");
        }
      }

      if (reasons.length > 0) {
        if (entry.key.startsWith("standalone-type:")) {
          const [, artworkId] = entry.key.split(":");
          const parentKey = `standalone:${artworkId}`;
          result.set(parentKey, [
            ...(result.get(parentKey) ?? []),
            ...reasons
          ]);
        } else {
          result.set(entry.key, [
            ...(result.get(entry.key) ?? []),
            ...reasons
          ]);
        }
      }
    }
  }

  return result;
}

export default async function ProductionPage({
  searchParams
}: {
  searchParams: Promise<{
    client?: string;
    designer?: string;
    source?: string;
    sla?: string;
    contract?: string;
  }>;
}) {
  const designer = await requireDesigner();
  const filters = await searchParams;

  const [clients, standalone, designers] = await Promise.all([
    getAccessibleClients(designer),
    getStandaloneArtworks(),
    designer.role === "DESIGNER" ? Promise.resolve([]) : getDesigners()
  ]);

  const extras = contractExtras(clients, standalone);
  const designerName = (id: string | null | undefined) => {
    if (!id) return null;
    if (id === designer.id) return designer.name;
    return designers.find((item) => item.id === id)?.name ?? null;
  };

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

          const assignedDesignerId =
            item.productionDesignerId ?? client.assignedDesignerId;
          const extraReasons = extras.get(`calendar:${item.id}`) ?? [];

          return [
            {
              id: item.id,
              source: "calendar",
              calendarId: calendar.id,
              clientId: client.id,
              clientName: client.name,
              context: calendar.title,
              title: item.title,
              status: calendarStatus(item.stage),
              column,
              points: item.effortPoints || 1,
              quantity: 1,
              dueAt: calendar.artworkDueAt,
              plannedProductionDate: item.plannedProductionDate,
              completedAt: item.artworkApprovedAt ?? item.publishedAt,
              href: `/calendars/${calendar.id}/content/${item.id}/artwork`,
              designerId: assignedDesignerId,
              designerName:
                designerName(assignedDesignerId) ??
                client.assignedDesigner?.name ??
                "Sem responsável",
              contractExtra: extraReasons.length > 0,
              extraReasons,
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

      const extraReasons = extras.get(`standalone:${artwork.id}`) ?? [];

      return [
        {
          id: artwork.id,
          source: "standalone",
          clientId: artwork.clientId,
          clientName: artwork.client.name,
          context: "Arte avulsa",
          title: artwork.title,
          status: standaloneStatus(artwork.status),
          column,
          points: artwork.effortPoints,
          quantity: artwork.quantity,
          dueAt: artwork.dueAt,
          plannedProductionDate: artwork.plannedProductionDate,
          completedAt: artwork.completedAt,
          href: "/artes-avulsas",
          priority: artwork.priority,
          nextcloudPath: artwork.nextcloudPath,
          designerId: artwork.designerId,
          designerName: artwork.designer.name,
          contractExtra: extraReasons.length > 0,
          extraReasons,
          movable: artwork.status !== "DELIVERED"
        }
      ];
    }
  );

  const allCards = [...calendarCards, ...standaloneCards];
  const capacityDesigners =
    designer.role === "DESIGNER"
      ? [
          {
            id: designer.id,
            name: designer.name,
            weeklyCapacityPoints: designer.weeklyCapacityPoints ?? 30
          }
        ]
      : designers.map((item) => ({
          id: item.id,
          name: item.name,
          weeklyCapacityPoints: item.weeklyCapacityPoints ?? 30
        }));

  const capacity = capacityDesigners.map((item) => {
    const activeCards = allCards.filter(
      (card) => card.column !== "DONE" && card.designerId === item.id
    );
    const usedPoints = activeCards.reduce(
      (sum, card) => sum + card.points,
      0
    );
    const remainingPoints = item.weeklyCapacityPoints - usedPoints;
    const percentage =
      item.weeklyCapacityPoints > 0
        ? Math.round((usedPoints / item.weeklyCapacityPoints) * 100)
        : 0;

    return {
      id: item.id,
      name: item.name,
      usedPoints,
      capacityPoints: item.weeklyCapacityPoints,
      remainingPoints,
      percentage,
      activeDemands: activeCards.length
    };
  });

  const cards = allCards.filter((card) => {
    if (designer.role === "DESIGNER" && card.designerId !== designer.id) {
      return false;
    }
    if (filters.client && card.clientId !== filters.client) return false;
    if (filters.designer && card.designerId !== filters.designer) return false;
    if (filters.source && card.source !== filters.source) return false;
    if (filters.sla && deadlineState(card.dueAt) !== filters.sla) return false;
    if (filters.contract === "extra" && !card.contractExtra) return false;
    if (filters.contract === "included" && card.contractExtra) return false;
    return true;
  });

  const hasActiveFilters = Boolean(
    filters.client ||
      filters.designer ||
      filters.source ||
      filters.sla ||
      filters.contract
  );

  const overdue = cards.filter(
    (card) => deadlineState(card.dueAt) === "overdue" && card.column !== "DONE"
  ).length;
  const risk = cards.filter(
    (card) => deadlineState(card.dueAt) === "risk" && card.column !== "DONE"
  ).length;
  const changes = cards.filter((card) => card.column === "CHANGES").length;
  const extrasCount = cards.filter((card) => card.contractExtra).length;

  return (
    <AppShell designer={designer} activeSection="production">
      <header className="page-header production-page-header">
        <div>
          <span className="micro-label">CENTRAL OPERACIONAL</span>
          <h1>Central de demandas</h1>
          <p>
            Arraste demandas, distribua a equipe e identifique automaticamente
            o que ultrapassou a franquia mensal do cliente.
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
        <article className={extrasCount ? "danger" : "success"}>
          <FiTool aria-hidden="true" />
          <div><small>Extras do contrato</small><strong>{extrasCount}</strong></div>
        </article>
      </section>

      <details className="demand-filter-panel" open={hasActiveFilters}>
        <summary>
          <span>
            <strong>Filtros</strong>
            <small>
              {hasActiveFilters
                ? "Filtros ativos nesta visualização"
                : "Refine por cliente, responsável, SLA ou contrato"}
            </small>
          </span>
          <span className="demand-filter-count">
            {cards.length} demanda(s)
          </span>
        </summary>
        <div className="demand-filter-content">
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

            <label>
              <span>Contrato</span>
              <select name="contract" defaultValue={filters.contract ?? ""}>
                <option value="">Todos</option>
                <option value="included">Dentro da franquia</option>
                <option value="extra">Extra do contrato</option>
              </select>
            </label>

            <button className="button button-dark" type="submit">Filtrar</button>
            <Link className="button button-ghost" href="/producao">Limpar</Link>
          </form>

          <div className="demand-source-legend">
            <span><FiLayers /> Calendário: {calendarCards.length}</span>
            <span>Avulsas: {standaloneCards.length}</span>
            <span><FiCheckCircle /> Exibindo: {cards.length}</span>
            <span><FiAlertCircle /> Extras: {extrasCount}</span>
          </div>

        </div>
      </details>


      <OperationalKanban
        initialCards={cards}
        designers={capacity.map((item) => ({
          id: item.id,
          name: item.name,
          usedPoints: item.usedPoints,
          capacityPoints: item.capacityPoints,
          remainingPoints: item.remainingPoints,
          percentage: item.percentage,
          activeDemands: item.activeDemands
        }))}
        canReassign={designer.role !== "DESIGNER"}
      />
    </AppShell>
  );
}
