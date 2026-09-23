import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import {
  createContentItem,
  rotateCalendarToken
} from "../../actions";
import { requireDesigner } from "../../../lib/auth";
import {
  ContentItem,
  getCalendar,
  getDashboard
} from "../../../lib/api";

const statusLabel = {
  DRAFT: "Rascunho",
  PENDING_APPROVAL: "Aguardando",
  APPROVED: "Aprovado",
  CHANGES_REQUESTED: "Alteração"
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

  return (
    <div className={`preview-art art-tone-${index % 3} ${className}`}>
      <span className="art-kicker">TERCEIRO ANDAR</span>
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
  const [designer, clients, calendar] = await Promise.all([
    requireDesigner(),
    getDashboard(),
    getCalendar(calendarId)
  ]);

  if (!calendar) {
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
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const shareUrl = `${appUrl}/p/${calendar.shareToken}`;

  return (
    <AppShell
      designer={designer}
      clients={clients}
      activeClientId={calendar.client.id}
    >
      <header className="calendar-header">
        <div>
          <Link
            href={`/clients/${calendar.client.id}`}
            className="back-link"
          >
            ← {calendar.client.name}
          </Link>
          <span className="micro-label">PRÉVIA DO FEED · APROVAÇÃO</span>
          <h1>{calendar.title}</h1>
          <p>
            Clique em qualquer peça para abrir os detalhes. O cliente vê a
            mesma lógica pelo link de aprovação.
          </p>
        </div>

        <div className="calendar-actions">
          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="button button-ghost"
          >
            Abrir link do cliente ↗
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
        <div className="share-inline">
          <span>Link de aprovação</span>
          <code>{shareUrl}</code>
        </div>
        <form action={rotateCalendarToken.bind(null, calendar.id)}>
          <button type="submit" className="text-button">
            Gerar novo link
          </button>
        </form>
      </section>

      <section className="feed-board">
        {calendar.contentItems.length === 0 ? (
          <div className="feed-empty">
            <span>+</span>
            <h2>O calendário está vazio</h2>
            <p>Adicione a primeira peça para começar a montar a prévia.</p>
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

      <section className="composer-surface" id="novo-conteudo">
        <div className="composer-heading">
          <div>
            <span className="micro-label">NOVA PEÇA</span>
            <h2>Adicionar ao calendário</h2>
          </div>
          <p>
            Para este MVP a arte pode ser uma URL pública. Depois podemos ligar
            upload direto em R2/S3.
          </p>
        </div>

        <form action={createContentItem} className="content-form">
          <input type="hidden" name="calendarId" value={calendar.id} />

          <label className="field field-span-2">
            <span>Título da peça</span>
            <input
              name="title"
              placeholder="Ex.: Posicionamento da marca"
              required
            />
          </label>

          <label className="field">
            <span>Data e hora</span>
            <input type="datetime-local" name="scheduledAt" required />
          </label>

          <label className="field">
            <span>Canal</span>
            <select name="channel" defaultValue="INSTAGRAM" required>
              <option value="INSTAGRAM">Instagram</option>
              <option value="STORIES">Stories</option>
              <option value="FACEBOOK">Facebook</option>
              <option value="LINKEDIN">LinkedIn</option>
              <option value="TIKTOK">TikTok</option>
              <option value="OTHER">Outro</option>
            </select>
          </label>

          <label className="field">
            <span>Formato</span>
            <input
              name="format"
              placeholder="Feed 1080x1350"
              required
            />
          </label>

          <label className="field">
            <span>URL da arte</span>
            <input
              type="url"
              name="assetUrl"
              placeholder="https://..."
            />
          </label>

          <label className="field field-span-2">
            <span>Legenda</span>
            <textarea
              name="caption"
              rows={5}
              placeholder="Texto que será apresentado ao cliente..."
              required
            />
          </label>

          <div className="form-actions field-span-2">
            <button type="submit" className="button button-primary">
              Adicionar ao calendário
            </button>
          </div>
        </form>
      </section>

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
                  PEÇA {String(selectedIndex + 1).padStart(2, "0")}
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
                  <span>{selectedItem.channel}</span>
                  <span>{selectedItem.format}</span>
                  <span>{formatDate(selectedItem.scheduledAt)}</span>
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
