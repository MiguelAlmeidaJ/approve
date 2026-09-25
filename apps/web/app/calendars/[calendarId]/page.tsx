import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FiAlertCircle,
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiEdit3,
  FiExternalLink,
  FiImage,
  FiLayers,
  FiPlay,
  FiRefreshCw,
  FiSend,
  FiSmartphone,
  FiUploadCloud
} from "react-icons/fi";
import { AppShell } from "../../../components/app-shell";
import { requireDesigner } from "../../../lib/auth";
import {
  canAccessClient,
  getCalendar,
  getCommemorativeDates,
  type CalendarStage,
  type ContentItem,
  type ContentStage
} from "../../../lib/api";
import {
  archiveCalendar,
  markContentPublished,
  markContentScheduled,
  restoreCalendar,
  rotateCalendarToken,
  submitArtwork,
  submitPlanning
} from "../../actions";

const workflowSteps: Array<{
  key: "PLANNING" | "PRE_APPROVAL" | "PRODUCTION" | "FINAL_APPROVAL" | "SCHEDULING";
  label: string;
  short: string;
}> = [
  { key: "PLANNING", label: "Planejamento", short: "Briefing" },
  { key: "PRE_APPROVAL", label: "Pré-aprovação", short: "Cliente" },
  { key: "PRODUCTION", label: "Produção", short: "Designer" },
  { key: "FINAL_APPROVAL", label: "Aprovação da arte", short: "Cliente" },
  { key: "SCHEDULING", label: "Programação", short: "mLabs" }
];

const contentStageLabel: Record<ContentStage, string> = {
  PLANNING: "Em planejamento",
  PRE_APPROVAL_PENDING: "Aguardando pré-aprovação",
  PRE_APPROVED: "Planejamento aprovado",
  PRE_CHANGES_REQUESTED: "Ajuste no planejamento",
  DESIGN_PENDING: "Aguardando designer",
  DESIGN_IN_PROGRESS: "Arte em produção",
  ART_APPROVAL_PENDING: "Aguardando aprovação da arte",
  ART_CHANGES_REQUESTED: "Ajuste de arte",
  ART_APPROVED: "Arte aprovada",
  READY_TO_SCHEDULE: "Pronto para programar",
  SCHEDULED: "Programado",
  PUBLISHED: "Publicado",
  SCHEDULING_ERROR: "Erro na programação"
};

function stageIndex(stage: CalendarStage) {
  if (stage === "COMPLETED") {
    return workflowSteps.length;
  }
  if (stage === "ARCHIVED") {
    return -1;
  }
  return workflowSteps.findIndex((step) => step.key === stage);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "America/Sao_Paulo"
  })
    .format(new Date(value))
    .replaceAll(".", "");
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo"
  }).format(new Date(value));
}

function statusTone(stage: ContentStage) {
  if (
    [
      "PRE_CHANGES_REQUESTED",
      "ART_CHANGES_REQUESTED",
      "SCHEDULING_ERROR"
    ].includes(stage)
  ) {
    return "danger";
  }

  if (
    [
      "PRE_APPROVED",
      "ART_APPROVED",
      "READY_TO_SCHEDULE",
      "SCHEDULED",
      "PUBLISHED"
    ].includes(stage)
  ) {
    return "success";
  }

  if (
    ["PRE_APPROVAL_PENDING", "ART_APPROVAL_PENDING"].includes(stage)
  ) {
    return "warning";
  }

  return "neutral";
}

function TypeIcon({ item }: { item: ContentItem }) {
  if (item.contentType === "CAROUSEL") {
    return <FiLayers aria-hidden="true" />;
  }
  if (item.contentType === "REEL") {
    return <FiPlay aria-hidden="true" />;
  }
  if (item.contentType === "STORY") {
    return <FiSmartphone aria-hidden="true" />;
  }
  return <FiImage aria-hidden="true" />;
}

export default async function CalendarPage({
  params
}: {
  params: Promise<{ calendarId: string }>;
}) {
  const { calendarId } = await params;
  const designer = await requireDesigner();
  const [calendar, commemorativeDates] = await Promise.all([
    getCalendar(calendarId),
    getCommemorativeDates()
  ]);

  if (!calendar || !canAccessClient(designer, calendar.client)) {
    notFound();
  }

  const isManager = designer.role === "ADMIN" || designer.role === "DEV";
  const currentIndex = stageIndex(calendar.stage);
  const appUrl = process.env.APP_URL ?? "http://localhost:4334";
  const shareUrl = `${appUrl.replace(/\/$/, "")}/p/${calendar.shareToken}`;
  const planningChanges = calendar.contentItems.filter(
    (item) => item.stage === "PRE_CHANGES_REQUESTED"
  ).length;
  const artChanges = calendar.contentItems.filter(
    (item) => item.stage === "ART_CHANGES_REQUESTED"
  ).length;
  const readyArtwork = calendar.contentItems.filter(
    (item) =>
      item.stage === "DESIGN_IN_PROGRESS" ||
      item.stage === "ART_APPROVED"
  ).length;
  const canSubmitArtwork =
    calendar.stage === "PRODUCTION" &&
    calendar.contentItems.length > 0 &&
    calendar.contentItems.every(
      (item) =>
        item.stage === "ART_APPROVED" ||
        (item.assets?.length ?? 0) > 0
    );
  const periodStart = new Date(calendar.periodStart);
  const periodEnd = new Date(calendar.periodEnd);
  const calendarCommemorativeDates = commemorativeDates
    .filter(
      (date) =>
        date.active &&
        (date.clientId === null || date.clientId === calendar.client.id)
    )
    .flatMap((date) => {
      const years = date.year
        ? [date.year]
        : Array.from(
            {
              length:
                periodEnd.getUTCFullYear() -
                periodStart.getUTCFullYear() +
                1
            },
            (_, index) => periodStart.getUTCFullYear() + index
          );

      return years.map((year) => ({
        ...date,
        occurrence: new Date(
          Date.UTC(year, date.month - 1, date.day, 12, 0, 0)
        )
      }));
    })
    .filter(
      (date) =>
        date.occurrence >= periodStart &&
        date.occurrence <= periodEnd
    )
    .sort(
      (first, second) =>
        first.occurrence.getTime() - second.occurrence.getTime()
    );

  return (
    <AppShell designer={designer} activeSection="calendars">
      <header className="calendar-workflow-header">
        <div>
          <Link href={`/clients/${calendar.client.id}`} className="back-link">
            <FiArrowLeft aria-hidden="true" />
            {calendar.client.name}
          </Link>
          <span className="micro-label">FLUXO DE CONTEÚDO</span>
          <h1>{calendar.title}</h1>
          <p>
            Planejamento, produção, aprovação e programação em uma única
            esteira.
          </p>
        </div>

        <div className="calendar-workflow-actions">
          {isManager &&
          !calendar.archivedAt &&
          calendar.stage === "PLANNING" ? (
            <>
              <Link
                href={`/calendars/${calendar.id}/edit`}
                className="button button-ghost"
              >
                <FiEdit3 aria-hidden="true" />
                Editar calendário
              </Link>
              <Link
                href={`/calendars/${calendar.id}/planning/new`}
                className="button button-primary"
              >
                + Nova publicação
              </Link>
            </>
          ) : null}

          {!calendar.archivedAt &&
          calendar.stage !== "PLANNING" &&
          calendar.stage !== "PRODUCTION" ? (
            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="button button-ghost"
            >
              <FiExternalLink aria-hidden="true" />
              Link do cliente
            </a>
          ) : null}
        </div>
      </header>

      <section className="workflow-stepper">
        {workflowSteps.map((step, index) => {
          const completed =
            calendar.stage === "COMPLETED" || index < currentIndex;
          const active = index === currentIndex;

          return (
            <div
              className={[
                "workflow-step",
                active ? "active" : "",
                completed ? "completed" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              key={step.key}
            >
              <span className="workflow-step-dot">
                {completed ? <FiCheck aria-hidden="true" /> : index + 1}
              </span>
              <div>
                <strong>{step.label}</strong>
                <small>{step.short}</small>
              </div>
            </div>
          );
        })}
      </section>

      {calendar.archivedAt ? (
        <section className="workflow-callout neutral">
          <div>
            <span className="micro-label">ARQUIVADO</span>
            <h2>Este calendário está arquivado</h2>
            <p>Restaure-o para continuar o fluxo de trabalho.</p>
          </div>
          {isManager ? (
            <form action={restoreCalendar.bind(null, calendar.id)}>
              <button type="submit" className="button button-dark">
                Restaurar calendário
              </button>
            </form>
          ) : null}
        </section>
      ) : null}

      {!calendar.archivedAt && calendar.stage === "PLANNING" ? (
        <section className="workflow-callout">
          <div>
            <span className="micro-label">ETAPA 01 · PLANEJAMENTO</span>
            <h2>Monte o pré-calendário</h2>
            <p>
              Defina tema, headline, subheadline, legenda, data e tipo de cada
              publicação. A produção só começa após a aprovação do cliente.
            </p>
          </div>
          {isManager && calendar.contentItems.length > 0 ? (
            <form action={submitPlanning.bind(null, calendar.id)}>
              <button type="submit" className="button button-primary">
                <FiSend aria-hidden="true" />
                Enviar pré-calendário
              </button>
            </form>
          ) : null}
        </section>
      ) : null}

      {!calendar.archivedAt && calendar.stage === "PRE_APPROVAL" ? (
        <section className="workflow-callout warning">
          <div>
            <span className="micro-label">ETAPA 02 · CLIENTE</span>
            <h2>
              {planningChanges > 0
                ? `${planningChanges} ajuste(s) solicitado(s)`
                : "Pré-calendário em aprovação"}
            </h2>
            <p>
              {planningChanges > 0
                ? "Edite as peças sinalizadas e reenvie o planejamento. As demais aprovações são preservadas."
                : "O cliente está revisando o briefing antes da produção das artes."}
            </p>
          </div>
          <div className="workflow-callout-actions">
            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="button button-ghost"
            >
              <FiExternalLink aria-hidden="true" />
              Abrir prévia do cliente
            </a>
            {isManager && planningChanges > 0 ? (
              <form action={submitPlanning.bind(null, calendar.id)}>
                <button type="submit" className="button button-primary">
                  <FiRefreshCw aria-hidden="true" />
                  Reenviar pré-calendário
                </button>
              </form>
            ) : null}
          </div>
        </section>
      ) : null}

      {!calendar.archivedAt && calendar.stage === "PRODUCTION" ? (
        <section className="workflow-callout production">
          <div>
            <span className="micro-label">ETAPA 03 · PRODUÇÃO</span>
            <h2>
              {artChanges > 0
                ? `${artChanges} arte(s) precisam de ajuste`
                : "Briefing aprovado. Hora de produzir."}
            </h2>
            <p>
              O designer responsável pode anexar as artes direto do Nextcloud.
              Quando todas estiverem prontas, envie o conjunto para o cliente.
            </p>
          </div>
          <div className="workflow-callout-actions">
            <span className="workflow-progress-note">
              {readyArtwork}/{calendar.contentItems.length} com arte
            </span>
            {canSubmitArtwork ? (
              <form action={submitArtwork.bind(null, calendar.id)}>
                <button type="submit" className="button button-primary">
                  <FiSend aria-hidden="true" />
                  Enviar artes para aprovação
                </button>
              </form>
            ) : null}
          </div>
        </section>
      ) : null}

      {!calendar.archivedAt && calendar.stage === "FINAL_APPROVAL" ? (
        <section className="workflow-callout warning">
          <div>
            <span className="micro-label">ETAPA 04 · APROVAÇÃO FINAL</span>
            <h2>Artes aguardando o cliente</h2>
            <p>
              O link público agora exibe a experiência visual do feed para a
              aprovação final das peças.
            </p>
          </div>
          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="button button-primary"
          >
            <FiExternalLink aria-hidden="true" />
            Abrir aprovação das artes
          </a>
        </section>
      ) : null}

      {!calendar.archivedAt &&
      ["SCHEDULING", "COMPLETED"].includes(calendar.stage) ? (
        <section className="workflow-callout success">
          <div>
            <span className="micro-label">
              {calendar.stage === "COMPLETED"
                ? "FLUXO CONCLUÍDO"
                : "ETAPA 05 · PROGRAMAÇÃO"}
            </span>
            <h2>
              {calendar.stage === "COMPLETED"
                ? "Calendário publicado"
                : "Conteúdos prontos para programação"}
            </h2>
            <p>
              A fila abaixo está preparada para a integração com a mLabs. Até a
              conexão da API ser configurada, o status de programação pode ser
              registrado manualmente.
            </p>
          </div>
        </section>
      ) : null}

      <section className="workflow-summary">
        <article>
          <small>Publicações</small>
          <strong>{calendar.contentItems.length}</strong>
        </article>
        <article>
          <small>Dias planejados</small>
          <strong>{calendar.postingDays.length}</strong>
        </article>
        <article>
          <small>Ajustes solicitados</small>
          <strong>{planningChanges + artChanges}</strong>
        </article>
        <article>
          <small>Responsável</small>
          <strong className="workflow-summary-name">
            {calendar.client.assignedDesigner?.name ?? "Sem designer"}
          </strong>
        </article>
      </section>

      {calendarCommemorativeDates.length > 0 ? (
        <section className="calendar-opportunities-panel">
          <div className="calendar-opportunities-heading">
            <div>
              <span className="micro-label">OPORTUNIDADES DE PAUTA</span>
              <h2>Datas comemorativas do período</h2>
              <p>
                Use essas datas como referência para criar pautas especiais sem
                perder o ritmo de publicação do cliente.
              </p>
            </div>
            <Link href="/datas-comemorativas">Ver calendário de datas</Link>
          </div>

          <div className="calendar-opportunities-list">
            {calendarCommemorativeDates.map((date) => (
              <article
                className="calendar-opportunity-card"
                key={`${date.id}-${date.occurrence.getUTCFullYear()}`}
              >
                <div className="calendar-opportunity-date">
                  <strong>
                    {String(date.occurrence.getUTCDate()).padStart(2, "0")}
                  </strong>
                  <span>
                    {new Intl.DateTimeFormat("pt-BR", {
                      month: "short",
                      timeZone: "UTC"
                    })
                      .format(date.occurrence)
                      .replace(".", "")
                      .toUpperCase()}
                  </span>
                </div>
                <div>
                  <span>
                    {date.scope === "NATIONAL"
                      ? "Nacional"
                      : date.client?.name ?? "Personalizada"}
                  </span>
                  <strong>{date.name}</strong>
                  <small>
                    {date.description ||
                      [date.city, date.state].filter(Boolean).join(" · ") ||
                      "Oportunidade de conteúdo"}
                  </small>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="workflow-content-section">
        <div className="workflow-section-heading">
          <div>
            <span className="micro-label">PUBLICAÇÕES</span>
            <h2>Conteúdo do calendário</h2>
          </div>
          <span>{calendar.contentItems.length} peça(s)</span>
        </div>

        {calendar.contentItems.length === 0 ? (
          <div className="workflow-empty">
            <FiCalendar aria-hidden="true" />
            <strong>O pré-calendário ainda está vazio.</strong>
            <p>Adicione a primeira publicação para iniciar o fluxo.</p>
            {isManager && calendar.stage === "PLANNING" ? (
              <Link
                href={`/calendars/${calendar.id}/planning/new`}
                className="button button-primary"
              >
                + Nova publicação
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="workflow-item-list">
            {calendar.contentItems.map((item) => {
              const latestReview = item.reviews?.[0];
              const canEditPlanning =
                isManager &&
                ["PLANNING", "PRE_APPROVAL"].includes(calendar.stage);
              const canAttachArtwork =
                calendar.stage === "PRODUCTION" &&
                [
                  "DESIGN_PENDING",
                  "DESIGN_IN_PROGRESS",
                  "ART_CHANGES_REQUESTED"
                ].includes(item.stage);

              return (
                <article className="workflow-item-card" key={item.id}>
                  <div className="workflow-item-date">
                    <strong>{formatDate(item.scheduledAt)}</strong>
                    <span>
                      <FiClock aria-hidden="true" />
                      {formatTime(item.scheduledAt)}
                    </span>
                  </div>

                  <div className="workflow-item-type">
                    <span>
                      <TypeIcon item={item} />
                    </span>
                    <div>
                      <strong>{item.contentType}</strong>
                      <small>
                        {item.publishToFeed ? "Feed" : ""}
                        {item.publishToFeed && item.publishToStories
                          ? " + "
                          : ""}
                        {item.publishToStories ? "Stories" : ""}
                      </small>
                    </div>
                  </div>

                  <div className="workflow-item-copy">
                    <strong>{item.title}</strong>
                    <span>{item.theme || "Tema não informado"}</span>
                    {item.headline ? <p>{item.headline}</p> : null}
                  </div>

                  {item.assets?.[0] ? (
                    <div className="workflow-item-art">
                      {item.assets[0].mimeType?.startsWith("video/") ? (
                        <span>
                          <FiPlay aria-hidden="true" />
                          Vídeo anexado
                        </span>
                      ) : (
                        <img
                          src={`/api/media/${item.assets[0].id}`}
                          alt=""
                        />
                      )}
                      {item.assets.length > 1 ? (
                        <small>{item.assets.length} arquivos</small>
                      ) : null}
                    </div>
                  ) : (
                    <div className="workflow-item-art empty">
                      <FiUploadCloud aria-hidden="true" />
                      <span>Sem arte</span>
                    </div>
                  )}

                  <div className="workflow-item-state">
                    <span
                      className={`workflow-status ${statusTone(item.stage)}`}
                    >
                      {contentStageLabel[item.stage]}
                    </span>
                    {latestReview?.message ? (
                      <small title={latestReview.message}>
                        “{latestReview.message}”
                      </small>
                    ) : null}
                  </div>

                  <div className="workflow-item-actions">
                    {canEditPlanning ? (
                      <Link
                        href={`/calendars/${calendar.id}/planning/${item.id}/edit`}
                        className="button button-ghost button-small"
                      >
                        <FiEdit3 aria-hidden="true" />
                        Editar briefing
                      </Link>
                    ) : null}

                    {canAttachArtwork ? (
                      <Link
                        href={`/calendars/${calendar.id}/content/${item.id}/artwork`}
                        className="button button-primary button-small"
                      >
                        <FiUploadCloud aria-hidden="true" />
                        {item.assets.length > 0
                          ? "Substituir arte"
                          : "Anexar arte"}
                      </Link>
                    ) : null}

                    {isManager &&
                    ["READY_TO_SCHEDULE", "SCHEDULING_ERROR"].includes(
                      item.stage
                    ) ? (
                      <form action={markContentScheduled}>
                        <input
                          type="hidden"
                          name="calendarId"
                          value={calendar.id}
                        />
                        <input type="hidden" name="itemId" value={item.id} />
                        <button
                          type="submit"
                          className="button button-primary button-small"
                        >
                          <FiCheckCircle aria-hidden="true" />
                          Marcar programado
                        </button>
                      </form>
                    ) : null}

                    {isManager && item.stage === "SCHEDULED" ? (
                      <form action={markContentPublished}>
                        <input
                          type="hidden"
                          name="calendarId"
                          value={calendar.id}
                        />
                        <input type="hidden" name="itemId" value={item.id} />
                        <button
                          type="submit"
                          className="button button-dark button-small"
                        >
                          <FiCheck aria-hidden="true" />
                          Marcar publicado
                        </button>
                      </form>
                    ) : null}

                    {item.publishingError ? (
                      <span className="workflow-publishing-error">
                        <FiAlertCircle aria-hidden="true" />
                        {item.publishingError}
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {calendar.stage !== "PLANNING" && !calendar.archivedAt ? (
        <section className="calendar-public-link-card">
          <div>
            <span className="micro-label">LINK PÚBLICO DO CLIENTE</span>
            <strong>{shareUrl}</strong>
            <p>
              O mesmo link acompanha o calendário durante as fases de
              pré-aprovação e aprovação das artes.
            </p>
          </div>
          {isManager ? (
            <form action={rotateCalendarToken.bind(null, calendar.id)}>
              <button type="submit" className="button button-ghost">
                Renovar link
              </button>
            </form>
          ) : null}
        </section>
      ) : null}

      {isManager ? (
        <section className="calendar-danger-zone">
          <div>
            <span className="micro-label">
              {calendar.archivedAt ? "RESTAURAR" : "ARQUIVAR"}
            </span>
            <strong>
              {calendar.archivedAt
                ? "Reabrir este calendário"
                : "Encerrar este calendário"}
            </strong>
            <p>
              O histórico de planejamento, aprovações e artes permanece
              armazenado.
            </p>
          </div>
          {calendar.archivedAt ? (
            <form action={restoreCalendar.bind(null, calendar.id)}>
              <button type="submit" className="button button-dark">
                Restaurar calendário
              </button>
            </form>
          ) : (
            <form action={archiveCalendar.bind(null, calendar.id)}>
              <button type="submit" className="button button-danger-outline">
                Arquivar calendário
              </button>
            </form>
          )}
        </section>
      ) : null}
    </AppShell>
  );
}
