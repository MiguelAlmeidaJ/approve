import Link from "next/link";
import {
  FiAlertCircle,
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiImage,
  FiLayers,
  FiRefreshCw,
  FiTool
} from "react-icons/fi";
import { AppShell } from "../../components/app-shell";
import { requireDesigner } from "../../lib/auth";
import {
  getAccessibleClients,
  getStandaloneArtworks,
  type ContentItem
} from "../../lib/api";

const productionStages = [
  "DESIGN_PENDING",
  "DESIGN_IN_PROGRESS",
  "ART_CHANGES_REQUESTED"
] as const;

function calendarStageLabel(stage: ContentItem["stage"]) {
  if (stage === "ART_CHANGES_REQUESTED") return "Alteração solicitada";
  if (stage === "DESIGN_IN_PROGRESS") return "Em produção";
  return "Aguardando produção";
}

function standaloneStageLabel(status: string) {
  if (status === "REQUESTED") return "Solicitada";
  if (status === "IN_PRODUCTION") return "Em produção";
  if (status === "IN_APPROVAL") return "Em aprovação";
  if (status === "CHANGES_REQUESTED") return "Alteração solicitada";
  if (status === "APPROVED") return "Aprovada";
  return status;
}

function slaState(value: string | null) {
  if (!value) return { key: "no-deadline", label: "Sem prazo", order: 3 };
  const diff = new Date(value).getTime() - Date.now();
  const hours = Math.ceil(diff / (60 * 60 * 1000));

  if (hours < 0) {
    return {
      key: "overdue",
      label: `${Math.ceil(Math.abs(hours) / 24)} dia(s) atrasado`,
      order: 0
    };
  }

  if (hours <= 24) {
    return {
      key: "risk",
      label: hours <= 1 ? "Vence em até 1h" : `Vence em ${hours}h`,
      order: 1
    };
  }

  return {
    key: "on-time",
    label: hours <= 48 ? `Vence em ${hours}h` : `${Math.ceil(hours / 24)} dias`,
    order: 2
  };
}

export default async function ProductionPage() {
  const designer = await requireDesigner();
  const [clients, standalone] = await Promise.all([
    getAccessibleClients(designer),
    getStandaloneArtworks()
  ]);

  const calendarDemands = clients.flatMap((client) =>
    client.calendars.flatMap((calendar) =>
      calendar.contentItems
        .filter((item) =>
          productionStages.includes(
            item.stage as (typeof productionStages)[number]
          )
        )
        .map((item) => ({
          id: item.id,
          source: "calendar" as const,
          clientName: client.name,
          context: calendar.title,
          title: item.title,
          status: calendarStageLabel(item.stage),
          changes: item.stage === "ART_CHANGES_REQUESTED",
          inProgress: item.stage === "DESIGN_IN_PROGRESS",
          points: item.effortPoints || 1,
          quantity: 1,
          dueAt: calendar.artworkDueAt,
          href: `/calendars/${calendar.id}/content/${item.id}/artwork`,
          action: item.assets.length > 0 ? "Abrir arte" : "Produzir"
        }))
    )
  );

  const standaloneDemands = standalone
    .filter((artwork) => !["DELIVERED", "CANCELLED"].includes(artwork.status))
    .map((artwork) => ({
      id: artwork.id,
      source: "standalone" as const,
      clientName: artwork.client.name,
      context: "Arte avulsa",
      title: artwork.title,
      status: standaloneStageLabel(artwork.status),
      changes: artwork.status === "CHANGES_REQUESTED",
      inProgress: artwork.status === "IN_PRODUCTION",
      points: artwork.effortPoints,
      quantity: artwork.quantity,
      dueAt: artwork.dueAt,
      href: "/artes-avulsas",
      action: "Abrir demanda"
    }));

  const queue = [...calendarDemands, ...standaloneDemands]
    .map((demand) => ({
      ...demand,
      sla: slaState(demand.dueAt)
    }))
    .sort((a, b) => {
      if (a.sla.order !== b.sla.order) return a.sla.order - b.sla.order;
      const ad = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bd = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      return ad - bd;
    });

  const overdue = queue.filter((item) => item.sla.key === "overdue").length;
  const risk = queue.filter((item) => item.sla.key === "risk").length;
  const changes = queue.filter((item) => item.changes).length;
  const totalPoints = queue.reduce((sum, item) => sum + item.points, 0);

  return (
    <AppShell designer={designer} activeSection="production">
      <header className="page-header production-page-header">
        <div>
          <span className="micro-label">CENTRAL OPERACIONAL</span>
          <h1>Central de demandas</h1>
          <p>
            Calendários e artes avulsas em uma fila única, priorizada por SLA,
            alterações e prazo.
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
          <div><small>Alterações</small><strong>{changes}</strong></div>
        </article>
        <article className="success">
          <FiTool aria-hidden="true" />
          <div><small>Pontos na fila</small><strong>{totalPoints}</strong></div>
        </article>
      </section>

      <div className="demand-source-legend">
        <span><FiLayers /> Calendário: {calendarDemands.length}</span>
        <span><FiImage /> Avulsas: {standaloneDemands.length}</span>
        <span><FiCheckCircle /> Total: {queue.length}</span>
      </div>

      {queue.length === 0 ? (
        <div className="production-empty">
          <FiCheckCircle aria-hidden="true" />
          <strong>Fila de produção em dia.</strong>
          <p>Não existem demandas criativas em aberto neste momento.</p>
        </div>
      ) : (
        <section className="production-queue">
          {queue.map((demand) => (
            <article
              className={`production-row demand-row sla-${demand.sla.key}`}
              key={`${demand.source}-${demand.id}`}
            >
              <div className="production-row-client">
                <span>{demand.clientName.slice(0, 2).toUpperCase()}</span>
                <div>
                  <strong>{demand.clientName}</strong>
                  <small>
                    {demand.source === "calendar" ? "Calendário" : "Avulsa"} · {demand.context}
                  </small>
                </div>
              </div>

              <div className="production-row-content">
                <strong>{demand.title}</strong>
                <span>
                  {demand.quantity} peça(s) · {demand.points} ponto(s)
                </span>
              </div>

              <span
                className={
                  demand.changes
                    ? "workflow-status danger"
                    : demand.inProgress
                      ? "workflow-status warning"
                      : "workflow-status neutral"
                }
              >
                {demand.status}
              </span>

              <div className={`production-due ${demand.sla.key === "overdue" ? "overdue" : ""}`}>
                {demand.sla.key === "overdue" ? <FiAlertCircle /> : <FiClock />}
                <span>
                  <small>SLA</small>
                  <strong>{demand.sla.label}</strong>
                </span>
              </div>

              <Link
                href={demand.href}
                className="button button-primary button-small"
              >
                {demand.action}
                <FiArrowRight aria-hidden="true" />
              </Link>
            </article>
          ))}
        </section>
      )}
    </AppShell>
  );
}
