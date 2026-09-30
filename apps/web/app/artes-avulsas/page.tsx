import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiImage,
  FiPlus,
  FiRefreshCw
} from "react-icons/fi";
import { AppShell } from "../../components/app-shell";
import { StandaloneArtworkCreateForm } from "../../components/standalone-artwork-create-form";
import { StandaloneArtworkStatusForm } from "../../components/standalone-artwork-status";
import { requireDesigner } from "../../lib/auth";
import {
  getAccessibleClients,
  getClientContractUsage,
  getDesigners,
  getStandaloneArtworks,
  type ContractUsage,
  type StandaloneArtworkStatus
} from "../../lib/api";

const statusLabels: Record<StandaloneArtworkStatus, string> = {
  REQUESTED: "Solicitada",
  IN_PRODUCTION: "Em produção",
  IN_APPROVAL: "Em aprovação",
  CHANGES_REQUESTED: "Ajustes solicitados",
  APPROVED: "Aprovada",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelada"
};

const priorityLabels = {
  LOW: "Baixa",
  NORMAL: "Normal",
  HIGH: "Alta",
  URGENT: "Urgente"
} as const;

function dateLabel(value: string | null) {
  if (!value) return "Sem prazo";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export default async function StandaloneArtworksPage() {
  const designer = await requireDesigner();
  const [clients, designers, artworks] = await Promise.all([
    getAccessibleClients(designer),
    designer.role === "DESIGNER" ? Promise.resolve([]) : getDesigners(),
    getStandaloneArtworks()
  ]);

  const contractUsage = (
    await Promise.all(
      clients.map((client) => getClientContractUsage(client.id))
    )
  ).filter(Boolean) as ContractUsage[];

  const team =
    designer.role === "DESIGNER"
      ? [
          {
            id: designer.id,
            name: designer.name,
            weeklyCapacityPoints: designer.weeklyCapacityPoints ?? 30
          }
        ]
      : designers
          .filter((item) => item.role === "DESIGNER" && item.active)
          .map((item) => ({
            id: item.id,
            name: item.name,
            weeklyCapacityPoints: item.weeklyCapacityPoints ?? 30
          }));

  const activeCalendarStages = [
    "DESIGN_PENDING",
    "DESIGN_IN_PROGRESS",
    "ART_CHANGES_REQUESTED"
  ];
  const designerLoad = team.map((item) => {
    const calendarPoints = clients.reduce(
      (clientSum, client) =>
        clientSum +
        client.calendars.reduce(
          (calendarSum, calendar) =>
            calendarSum +
            calendar.contentItems
              .filter(
                (content) =>
                  activeCalendarStages.includes(content.stage) &&
                  (content.productionDesignerId ??
                    client.assignedDesignerId) === item.id
              )
              .reduce(
                (sum, content) => sum + (content.effortPoints || 1),
                0
              ),
          0
        ),
      0
    );
    const standalonePoints = artworks
      .filter(
        (artwork) =>
          artwork.designerId === item.id &&
          !["DELIVERED", "CANCELLED"].includes(artwork.status)
      )
      .reduce((sum, artwork) => sum + artwork.effortPoints, 0);

    return {
      id: item.id,
      name: item.name,
      usedPoints: calendarPoints + standalonePoints,
      capacityPoints: item.weeklyCapacityPoints
    };
  });

  const open = artworks.filter(
    (artwork) => !["DELIVERED", "CANCELLED"].includes(artwork.status)
  );
  const overdue = open.filter(
    (artwork) => artwork.dueAt && new Date(artwork.dueAt) < new Date()
  );
  const inApproval = open.filter((artwork) => artwork.status === "IN_APPROVAL");
  const delivered = artworks.filter((artwork) => artwork.status === "DELIVERED");

  return (
    <AppShell designer={designer} activeSection="standalone">
      <header className="page-header">
        <div>
          <span className="micro-label">OPERAÇÃO</span>
          <h1>Artes avulsas</h1>
          <p>
            Demandas fora do calendário, com responsável, prazo, pontuação e
            acompanhamento do fluxo de produção.
          </p>
        </div>
      </header>

      <section className="standalone-kpis">
        <article>
          <FiImage />
          <div><small>Em aberto</small><strong>{open.length}</strong></div>
        </article>
        <article>
          <FiClock />
          <div><small>Em aprovação</small><strong>{inApproval.length}</strong></div>
        </article>
        <article>
          <FiAlertCircle />
          <div><small>Atrasadas</small><strong>{overdue.length}</strong></div>
        </article>
        <article>
          <FiCheckCircle />
          <div><small>Entregues</small><strong>{delivered.length}</strong></div>
        </article>
      </section>

      <section className="standalone-layout">
        <StandaloneArtworkCreateForm
          clients={clients.map((client) => ({
            id: client.id,
            name: client.name,
            assignedDesignerId: client.assignedDesignerId,
            defaultStandaloneSlaHours: client.defaultStandaloneSlaHours
          }))}
          designers={designerLoad}
          contractUsage={contractUsage}
          actor={{
            id: designer.id,
            name: designer.name,
            role: designer.role
          }}
        />

        <section className="standalone-list-card">
          <div className="section-heading">
            <div>
              <span className="micro-label">FILA</span>
              <h2>Demandas</h2>
            </div>
            <span>{artworks.length} total</span>
          </div>

          {artworks.length === 0 ? (
            <div className="filtered-empty">Nenhuma arte avulsa cadastrada.</div>
          ) : (
            <div className="standalone-list">
              {artworks.map((artwork) => {
                const isOverdue =
                  artwork.dueAt &&
                  !["DELIVERED", "CANCELLED"].includes(artwork.status) &&
                  new Date(artwork.dueAt) < new Date();

                return (
                  <article className="standalone-card" key={artwork.id}>
                    <div className="standalone-card-head">
                      <div>
                        <span className={"standalone-priority priority-" + artwork.priority.toLowerCase()}>
                          {priorityLabels[artwork.priority]}
                        </span>
                        <h3>{artwork.title}</h3>
                        <p>{artwork.client.name} · {artwork.designer.name}</p>
                      </div>
                      <span className={"standalone-status status-" + artwork.status.toLowerCase()}>
                        {statusLabels[artwork.status]}
                      </span>
                    </div>

                    <p className="standalone-briefing">{artwork.briefing}</p>

                    <div className="standalone-meta">
                      <span>{artwork.contentType}</span>
                      <span>{artwork.quantity} peça(s)</span>
                      <span>{artwork.effortPoints} pts</span>
                      <span className={isOverdue ? "is-overdue" : ""}>
                        {dateLabel(artwork.dueAt)}
                      </span>
                      {artwork.revisionCount > 0 ? (
                        <span><FiRefreshCw /> {artwork.revisionCount} ajuste(s)</span>
                      ) : null}
                    </div>

                    {artwork.nextcloudPath ? (
                      <div className="standalone-path">
                        Nextcloud: <code>{artwork.nextcloudPath}</code>
                      </div>
                    ) : null}

                    <StandaloneArtworkStatusForm
                      id={artwork.id}
                      clientId={artwork.clientId}
                      status={artwork.status}
                      currentPath={artwork.nextcloudPath}
                    />
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </AppShell>
  );
}
