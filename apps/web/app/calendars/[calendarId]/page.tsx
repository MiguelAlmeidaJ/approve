import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FiCalendar,
  FiClock,
  FiImage,
  FiLayers,
  FiLink,
  FiMonitor,
  FiPlay,
  FiSmartphone
} from "react-icons/fi";
import { AppShell } from "../../../components/app-shell";
import {
  archiveCalendar,
  moveContentItem,
  restoreCalendar,
  rotateCalendarToken
} from "../../actions";
import { requireDesigner } from "../../../lib/auth";
import {
  canAccessClient,
  ContentItem,
  getCalendar
} from "../../../lib/api";

const statusLabel = {
  DRAFT: "Rascunho",
  PENDING_APPROVAL: "Aguardando",
  APPROVED: "Aprovado",
  CHANGES_REQUESTED: "Alteração"
} as const;

const typeLabel = {
  POST: "Post",
  CAROUSEL: "Carrossel",
  REEL: "Reels",
  STORY: "Stories"
} as const;

const typeIcon = {
  POST: FiImage,
  CAROUSEL: FiLayers,
  REEL: FiPlay,
  STORY: FiSmartphone
} as const;

function saoPauloDateKey(value: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Sao_Paulo"
  }).formatToParts(new Date(value));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function saoPauloTime(value: string) {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Sao_Paulo"
  }).formatToParts(new Date(value));
  const hour = parts.find((part) => part.type === "hour")?.value ?? "12";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";

  return `${hour}:${minute}`;
}

function formatPostingDay(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "UTC"
  })
    .format(new Date(value))
    .replaceAll(".", "");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo"
  }).format(new Date(value));
}

function PreviewArt({
  item,
  index,
  className = ""
}: {
  item: ContentItem;
  index: number;
  className?: string;
}) {
  const primaryAsset = item.assets?.[0];

  if (primaryAsset) {
    const src = `/api/media/${primaryAsset.id}`;

    return (
      <div className={`preview-art has-image ${className}`}>
        {primaryAsset.mimeType?.startsWith("video/") ? (
          <video src={src} muted playsInline preload="metadata" />
        ) : (
          <img src={src} alt={item.title} />
        )}
      </div>
    );
  }

  if (item.assetUrl) {
    return (
      <div className={`preview-art has-image ${className}`}>
        <img src={item.assetUrl} alt={item.title} />
      </div>
    );
  }

  const Icon = typeIcon[item.contentType];

  return (
    <div className={`preview-art art-tone-${index % 3} ${className}`}>
      <span className="art-kicker">
        <Icon aria-hidden="true" />
        {typeLabel[item.contentType]}
      </span>
      <strong>{item.title}</strong>
      <i />
    </div>
  );
}

export default async function CalendarPage({
  params,
  searchParams
}: {
  params: Promise<{ calendarId: string }>;
  searchParams: Promise<{ item?: string }>;
}) {
  const { calendarId } = await params;
  const { item: selectedId } = await searchParams;
  const designer = await requireDesigner();
  const calendar = await getCalendar(calendarId);

  if (!calendar || !canAccessClient(designer, calendar.client)) {
    notFound();
  }

  const selectedIndex = calendar.contentItems.findIndex(
    (item) => item.id === selectedId
  );
  const selectedItem =
    selectedIndex >= 0 ? calendar.contentItems[selectedIndex] : null;
  const approved = calendar.contentItems.filter(
    (item) => item.status === "APPROVED"
  ).length;
  const appUrl = process.env.APP_URL ?? "http://localhost:4334";
  const shareUrl = `${appUrl.replace(/\/$/, "")}/p/${calendar.shareToken}`;
  const occupiedByDate = new Map(
    calendar.contentItems.map((contentItem) => [
      saoPauloDateKey(contentItem.scheduledAt),
      contentItem
    ])
  );
  const freeDays = calendar.postingDays.filter(
    (day) => !occupiedByDate.has(day.scheduledDate.slice(0, 10))
  ).length;

  return (
    <AppShell designer={designer} activeSection="calendars">
      <header className="calendar-header">
        <div>
          <Link
            href={`/clients/${calendar.client.id}`}
            className="back-link"
          >
            ← {calendar.client.name}
          </Link>
          <span className="micro-label">PLANEJAMENTO · INSTAGRAM</span>
          <h1>{calendar.title}</h1>
          <p>
            As datas de publicação já estão definidas. Adicione as peças usando
            os formatos padronizados e escolha Feed, Stories ou ambos.
          </p>
        </div>

        <div className="calendar-actions">
          {calendar.archivedAt ? null : (
            <Link
              href={`/calendars/${calendar.id}/edit`}
              className="button button-ghost"
            >
              Editar calendário
            </Link>
          )}
          {calendar.archivedAt ? null : (
            <Link
              href={`/calendars/${calendar.id}/content/new`}
              className="button button-primary"
            >
              + Adicionar conteúdo
            </Link>
          )}
        </div>
      </header>

      {calendar.archivedAt ? (
        <section className="calendar-archived-banner">
          <div>
            <strong>Calendário arquivado</strong>
            <span>
              Ele não aparece mais para o cliente e não aceita novas peças.
            </span>
          </div>
          <form action={restoreCalendar.bind(null, calendar.id)}>
            <button type="submit" className="button button-dark">
              Restaurar calendário
            </button>
          </form>
        </section>
      ) : null}

      <section className="calendar-overview-panel">
        <div className="calendar-kpi-grid">
          <article>
            <span>Peças</span>
            <strong>{calendar.contentItems.length}</strong>
          </article>
          <article>
            <span>Aprovadas</span>
            <strong>{approved}</strong>
          </article>
          <article>
            <span>Dias livres</span>
            <strong>{freeDays}</strong>
          </article>
          <article>
            <span>Dias planejados</span>
            <strong>{calendar.postingDays.length}</strong>
          </article>
        </div>

        <div className="calendar-public-access">
          <div>
            <span className="micro-label">LINK PÚBLICO</span>
            <strong>Visualização e aprovação sem login</strong>
            <code>{shareUrl}</code>
          </div>
          <div className="calendar-public-actions">
            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="button button-dark"
            >
              <FiLink aria-hidden="true" />
              Abrir link público
            </a>
            {calendar.archivedAt ? null : (
              <form action={rotateCalendarToken.bind(null, calendar.id)}>
                <button type="submit" className="button button-ghost">
                  Renovar link
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <section className="calendar-schedule-section">
        <div className="calendar-section-heading">
          <div>
            <span className="micro-label">AGENDA</span>
            <h2>Dias de publicação</h2>
          </div>
          <span>{freeDays} dia(s) disponível(is)</span>
        </div>

        <div className="calendar-schedule-grid">
          {calendar.postingDays.map((day) => {
            const dayKey = day.scheduledDate.slice(0, 10);
            const content = occupiedByDate.get(dayKey);

            return (
              <article
                className={
                  content
                    ? "calendar-schedule-day occupied"
                    : "calendar-schedule-day"
                }
                key={day.id}
              >
                <span className="calendar-schedule-icon">
                  <FiCalendar aria-hidden="true" />
                </span>
                <div>
                  <strong>{formatPostingDay(day.scheduledDate)}</strong>
                  <small>
                    {content ? content.title : "Disponível para conteúdo"}
                  </small>
                </div>
                <span className="calendar-day-state">
                  {content ? "Ocupado" : "Livre"}
                </span>
              </article>
            );
          })}
        </div>
      </section>

      <section className="feed-board">
        <div className="calendar-section-heading">
          <div>
            <span className="micro-label">CONTEÚDO</span>
            <h2>Peças do calendário</h2>
          </div>
          <span>
            {calendar.contentItems.length} peça(s) · {approved} aprovada(s)
          </span>
        </div>

        {calendar.contentItems.length === 0 ? (
          <div className="feed-empty">
            <span>+</span>
            <h2>O calendário está vazio</h2>
            <p>
              Os dias já estão planejados. Agora adicione a primeira peça.
            </p>
            {calendar.archivedAt ? null : (
              <Link
                href={`/calendars/${calendar.id}/content/new`}
                className="button button-primary"
              >
                Adicionar conteúdo
              </Link>
            )}
          </div>
        ) : (
          <div className="feed-grid">
            {calendar.contentItems.map((item, index) => (
              <Link
                href={`/calendars/${calendar.id}?item=${item.id}`}
                className="feed-card"
                key={item.id}
              >
                <div className="feed-card-number">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <PreviewArt item={item} index={index} />
                <div className="feed-card-info">
                  <div>
                    <strong>{item.title}</strong>
                    <span>{formatDate(item.scheduledAt)}</span>
                    <span className="content-destination-inline">
                      {item.publishToFeed ? (
                        <i><FiMonitor /> Feed</i>
                      ) : null}
                      {item.publishToStories ? (
                        <i><FiSmartphone /> Stories</i>
                      ) : null}
                    </span>
                  </div>
                  <span
                    className={`status-dot status-${item.status.toLowerCase()}`}
                    title={statusLabel[item.status]}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {calendar.archivedAt ? null : (
        <section className="calendar-danger-zone">
          <div>
            <span className="micro-label">ARQUIVAR</span>
            <strong>Encerrar este planejamento</strong>
            <p>
              O calendário sai das listas ativas e deixa de aparecer para o
              cliente. Você poderá restaurá-lo depois.
            </p>
          </div>
          <form action={archiveCalendar.bind(null, calendar.id)}>
            <button type="submit" className="button button-ghost danger">
              Arquivar calendário
            </button>
          </form>
        </section>
      )}

      {selectedItem ? (
        <div className="modal-layer">
          <Link
            href={`/calendars/${calendar.id}`}
            className="modal-backdrop"
            aria-label="Fechar detalhes"
          />
          <article className="content-modal">
            <div className="content-modal-head">
              <div>
                <span className="micro-label">
                  {typeLabel[selectedItem.contentType]} · PEÇA{" "}
                  {String(selectedIndex + 1).padStart(2, "0")}
                </span>
                <h2>{selectedItem.title}</h2>
              </div>
              <Link
                href={`/calendars/${calendar.id}`}
                className="modal-close"
                aria-label="Fechar"
              >
                ×
              </Link>
            </div>

            <div className="content-modal-body">
              <PreviewArt
                item={selectedItem}
                index={selectedIndex}
                className="modal-art"
              />

              <div className="modal-copy">
                <div className="modal-meta">
                  <span>{typeLabel[selectedItem.contentType]}</span>
                  <span>{selectedItem.format}</span>
                  <span>{formatDate(selectedItem.scheduledAt)}</span>
                </div>

                <div className="modal-destinations">
                  {selectedItem.publishToFeed ? (
                    <span><FiMonitor /> Feed</span>
                  ) : null}
                  {selectedItem.publishToStories ? (
                    <span><FiSmartphone /> Stories</span>
                  ) : null}
                </div>

                <div className="caption-panel">
                  <span className="micro-label">LEGENDA</span>
                  <p>{selectedItem.caption}</p>
                </div>

                {calendar.archivedAt ? null : (
                  <div className="content-reschedule-panel">
                    <div>
                      <span className="micro-label">REMANEJAR</span>
                      <strong>Alterar dia de publicação</strong>
                      <p>
                        Só aparecem os dias livres do planejamento. O conteúdo,
                        a arte e o status de aprovação são preservados.
                      </p>
                    </div>
                    <form action={moveContentItem}>
                      <input
                        type="hidden"
                        name="calendarId"
                        value={calendar.id}
                      />
                      <input
                        type="hidden"
                        name="itemId"
                        value={selectedItem.id}
                      />
                      <label className="field">
                        <span>Novo dia</span>
                        <select
                          name="postingDate"
                          defaultValue={saoPauloDateKey(
                            selectedItem.scheduledAt
                          )}
                          required
                        >
                          {calendar.postingDays.map((day) => {
                            const dayKey = day.scheduledDate.slice(0, 10);
                            const occupyingItem = occupiedByDate.get(dayKey);
                            const isCurrent =
                              occupyingItem?.id === selectedItem.id;
                            const unavailable =
                              Boolean(occupyingItem) && !isCurrent;

                            return (
                              <option
                                value={dayKey}
                                disabled={unavailable}
                                key={day.id}
                              >
                                {formatPostingDay(day.scheduledDate)}
                                {isCurrent
                                  ? " · atual"
                                  : unavailable
                                    ? " · ocupado"
                                    : " · livre"}
                              </option>
                            );
                          })}
                        </select>
                      </label>
                      <label className="field">
                        <span>Horário</span>
                        <div className="input-with-icon">
                          <FiClock aria-hidden="true" />
                          <input
                            type="time"
                            name="postingTime"
                            defaultValue={saoPauloTime(
                              selectedItem.scheduledAt
                            )}
                            required
                          />
                        </div>
                      </label>
                      <button
                        type="submit"
                        className="button button-ghost button-wide"
                      >
                        Remanejar publicação
                      </button>
                    </form>
                  </div>
                )}

                <div className="status-line">
                  <span
                    className={`status-pill status-${selectedItem.status.toLowerCase()}`}
                  >
                    {statusLabel[selectedItem.status]}
                  </span>
                  <span>Atualizado pelo fluxo de aprovação do cliente.</span>
                </div>
              </div>
            </div>
          </article>
        </div>
      ) : null}
    </AppShell>
  );
}
