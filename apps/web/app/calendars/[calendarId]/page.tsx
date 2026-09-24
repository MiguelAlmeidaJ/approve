import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FiImage,
  FiLayers,
  FiMonitor,
  FiPlay,
  FiSmartphone
} from "react-icons/fi";
import { AppShell } from "../../../components/app-shell";
import { ContentComposer } from "../../../components/content-composer";
import { rotateCalendarToken } from "../../actions";
import { requireDesigner } from "../../../lib/auth";
import {
  canAccessClient,
  ContentItem,
  getCalendar,
  getFormats
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
  const [calendar, formats] = await Promise.all([
    getCalendar(calendarId),
    getFormats()
  ]);

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
  const appUrl = process.env.APP_URL ?? "http://localhost:5005";
  const shareUrl = `${appUrl}/p/${calendar.shareToken}`;

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
          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="button button-ghost"
          >
            Visão do cliente ↗
          </a>
          <a href="#novo-conteudo" className="button button-primary">
            + Adicionar conteúdo
          </a>
        </div>
      </header>

      <section className="calendar-meta-bar">
        <div>
          <span>Peças</span>
          <strong>{calendar.contentItems.length}</strong>
        </div>
        <div>
          <span>Aprovadas</span>
          <strong>{approved}</strong>
        </div>
        <div>
          <span>Dias planejados</span>
          <strong>{calendar.postingDays.length}</strong>
        </div>
        <div className="share-inline">
          <span>Acesso do cliente</span>
          <code>/cliente</code>
        </div>
        <form action={rotateCalendarToken.bind(null, calendar.id)}>
          <button type="submit" className="text-button">
            Renovar link
          </button>
        </form>
      </section>

      <section className="feed-board">
        {calendar.contentItems.length === 0 ? (
          <div className="feed-empty">
            <span>+</span>
            <h2>O calendário está vazio</h2>
            <p>
              Os dias já estão planejados. Agora adicione a primeira peça.
            </p>
            <a href="#novo-conteudo" className="button button-primary">
              Adicionar conteúdo
            </a>
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

      <ContentComposer
        calendarId={calendar.id}
        postingDays={calendar.postingDays}
        formats={formats}
      />

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
