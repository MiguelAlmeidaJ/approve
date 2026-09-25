import Link from "next/link";
import {
  FiAlertCircle,
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiImage,
  FiRefreshCw,
  FiTool
} from "react-icons/fi";
import { AppShell } from "../../components/app-shell";
import { requireDesigner } from "../../lib/auth";
import { getAccessibleClients, type ContentItem } from "../../lib/api";

const productionStages = [
  "DESIGN_PENDING",
  "DESIGN_IN_PROGRESS",
  "ART_CHANGES_REQUESTED"
] as const;

function stageLabel(stage: ContentItem["stage"]) {
  if (stage === "ART_CHANGES_REQUESTED") return "Alteração solicitada";
  if (stage === "DESIGN_IN_PROGRESS") return "Em produção";
  return "Aguardando produção";
}

function dueLabel(value: string | null) {
  if (!value) return "Sem prazo";
  const date = new Date(value);
  const today = new Date();
  const diff = Math.ceil(
    (date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
  );

  if (diff < 0) return `${Math.abs(diff)} dia(s) atrasado`;
  if (diff === 0) return "Vence hoje";
  if (diff === 1) return "Vence amanhã";
  return `${diff} dias`;
}

export default async function ProductionPage() {
  const designer = await requireDesigner();
  const clients = await getAccessibleClients(designer);
  const queue = clients.flatMap((client) =>
    client.calendars.flatMap((calendar) =>
      calendar.contentItems
        .filter((item) =>
          productionStages.includes(
            item.stage as (typeof productionStages)[number]
          )
        )
        .map((item) => ({ client, calendar, item }))
    )
  );

  const changes = queue.filter(
    ({ item }) => item.stage === "ART_CHANGES_REQUESTED"
  ).length;
  const waiting = queue.filter(
    ({ item }) => item.stage === "DESIGN_PENDING"
  ).length;
  const inProgress = queue.filter(
    ({ item }) => item.stage === "DESIGN_IN_PROGRESS"
  ).length;

  const sorted = [...queue].sort((first, second) => {
    const a = first.calendar.artworkDueAt
      ? new Date(first.calendar.artworkDueAt).getTime()
      : Number.MAX_SAFE_INTEGER;
    const b = second.calendar.artworkDueAt
      ? new Date(second.calendar.artworkDueAt).getTime()
      : Number.MAX_SAFE_INTEGER;
    return a - b;
  });

  return (
    <AppShell designer={designer} activeSection="production">
      <header className="page-header production-page-header">
        <div>
          <span className="micro-label">MINHA FILA</span>
          <h1>Produção</h1>
          <p>
            Priorize artes novas e alterações pelo prazo de cada calendário.
          </p>
        </div>
      </header>

      <section className="production-summary">
        <article>
          <FiImage aria-hidden="true" />
          <div><small>Aguardando arte</small><strong>{waiting}</strong></div>
        </article>
        <article>
          <FiTool aria-hidden="true" />
          <div><small>Em produção</small><strong>{inProgress}</strong></div>
        </article>
        <article className="danger">
          <FiRefreshCw aria-hidden="true" />
          <div><small>Alterações</small><strong>{changes}</strong></div>
        </article>
        <article className="success">
          <FiCheckCircle aria-hidden="true" />
          <div><small>Total na fila</small><strong>{queue.length}</strong></div>
        </article>
      </section>

      {sorted.length === 0 ? (
        <div className="production-empty">
          <FiCheckCircle aria-hidden="true" />
          <strong>Fila de produção em dia.</strong>
          <p>Não existem peças aguardando arte ou alteração neste momento.</p>
        </div>
      ) : (
        <section className="production-queue">
          {sorted.map(({ client, calendar, item }) => {
            const overdue =
              calendar.artworkDueAt &&
              new Date(calendar.artworkDueAt).getTime() < Date.now();

            return (
              <article className="production-row" key={item.id}>
                <div className="production-row-client">
                  <span>{client.name.slice(0, 2).toUpperCase()}</span>
                  <div>
                    <strong>{client.name}</strong>
                    <small>{calendar.title}</small>
                  </div>
                </div>

                <div className="production-row-content">
                  <strong>{item.title}</strong>
                  <span>{item.headline || item.theme || "Briefing aprovado"}</span>
                </div>

                <span
                  className={
                    item.stage === "ART_CHANGES_REQUESTED"
                      ? "workflow-status danger"
                      : item.stage === "DESIGN_IN_PROGRESS"
                        ? "workflow-status warning"
                        : "workflow-status neutral"
                  }
                >
                  {stageLabel(item.stage)}
                </span>

                <div className={overdue ? "production-due overdue" : "production-due"}>
                  {overdue ? <FiAlertCircle /> : <FiClock />}
                  <span>
                    <small>Prazo de arte</small>
                    <strong>{dueLabel(calendar.artworkDueAt)}</strong>
                  </span>
                </div>

                <Link
                  href={`/calendars/${calendar.id}/content/${item.id}/artwork`}
                  className="button button-primary button-small"
                >
                  {item.assets.length > 0 ? "Abrir arte" : "Produzir"}
                  <FiArrowRight aria-hidden="true" />
                </Link>
              </article>
            );
          })}
        </section>
      )}
    </AppShell>
  );
}
