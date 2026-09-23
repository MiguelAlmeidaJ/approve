import Link from "next/link";
import { notFound } from "next/navigation";
import { Brand } from "../../../components/brand";
import {
  ContentItem,
  getPublicCalendar
} from "../../../lib/api";
import { submitReview } from "./actions";

const statusText = {
  DRAFT: "Rascunho",
  PENDING_APPROVAL: "Aguardando aprovação",
  APPROVED: "Aprovado",
  CHANGES_REQUESTED: "Alteração solicitada"
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

function PublicArt({
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

export default async function ApprovalPage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ item?: string }>;
}) {
  const { token } = await params;
  const { item: selectedId } = await searchParams;
  const calendar = await getPublicCalendar(token);

  if (!calendar) {
    notFound();
  }

  const selectedIndex = calendar.contentItems.findIndex(
    (item) => item.id === selectedId
  );
  const selectedItem =
    selectedIndex >= 0 ? calendar.contentItems[selectedIndex] : null;
  const latestReview = selectedItem?.reviews?.[0];
  const approved = calendar.contentItems.filter(
    (item) => item.status === "APPROVED"
  ).length;

  return (
    <main className="public-page">
      <header className="public-topbar">
        <Brand />
        <div>
          <span>{calendar.client.name}</span>
          <strong>Aprovação de conteúdo</strong>
        </div>
      </header>

      <section className="public-heading">
        <div>
          <span className="micro-label">PRÉVIA DO FEED · APROVAÇÃO</span>
          <h1>{calendar.title}</h1>
          <p>
            Toque em qualquer post para ver o conteúdo completo, conferir a
            legenda e aprovar ou solicitar uma alteração.
          </p>
        </div>

        <div className="public-progress">
          <strong>
            {approved}/{calendar.contentItems.length}
          </strong>
          <span>aprovados</span>
        </div>
      </section>

      {calendar.contentItems.length === 0 ? (
        <div className="public-empty">
          A equipe ainda não adicionou peças a este calendário.
        </div>
      ) : (
        <section className="feed-grid public-feed-grid">
          {calendar.contentItems.map((item, index) => (
            <Link
              href={`/p/${token}?item=${item.id}`}
              className="feed-card"
              key={item.id}
            >
              <div className="feed-card-number">
                {String(index + 1).padStart(2, "0")}
              </div>
              <PublicArt item={item} index={index} />
              <div className="feed-card-info">
                <div>
                  <strong>{item.title}</strong>
                  <span>{formatDate(item.scheduledAt)}</span>
                </div>
                <span
                  className={`status-dot status-${item.status.toLowerCase()}`}
                  title={statusText[item.status]}
                />
              </div>
            </Link>
          ))}
        </section>
      )}

      <footer className="public-footer">
        <Brand />
        <span>Terceiro Andar · Aprovação de conteúdo</span>
      </footer>

      {selectedItem ? (
        <div className="modal-layer">
          <Link
            href={`/p/${token}`}
            className="modal-backdrop"
            aria-label="Fechar conteúdo"
          />
          <article className="content-modal approval-modal">
            <div className="content-modal-head">
              <div>
                <span className="micro-label">
                  PEÇA {String(selectedIndex + 1).padStart(2, "0")}
                </span>
                <h2>{selectedItem.title}</h2>
              </div>
              <Link
                href={`/p/${token}`}
                className="modal-close"
                aria-label="Fechar"
              >
                ×
              </Link>
            </div>

            <div className="content-modal-body">
              <PublicArt
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

                {latestReview?.message ? (
                  <div className="feedback-panel">
                    <span className="micro-label">ÚLTIMO COMENTÁRIO</span>
                    <p>{latestReview.message}</p>
                  </div>
                ) : null}

                <div className="approval-actions">
                  <form action={submitReview} className="approval-form">
                    <input type="hidden" name="token" value={token} />
                    <input
                      type="hidden"
                      name="itemId"
                      value={selectedItem.id}
                    />
                    <input type="hidden" name="action" value="APPROVED" />
                    <label className="field">
                      <span>Seu nome (opcional)</span>
                      <input name="reviewerName" maxLength={120} />
                    </label>
                    <button
                      className="button button-dark button-wide"
                      type="submit"
                      disabled={selectedItem.status === "APPROVED"}
                    >
                      {selectedItem.status === "APPROVED"
                        ? "Conteúdo aprovado"
                        : "Aprovar conteúdo"}
                    </button>
                  </form>

                  <form action={submitReview} className="approval-form">
                    <input type="hidden" name="token" value={token} />
                    <input
                      type="hidden"
                      name="itemId"
                      value={selectedItem.id}
                    />
                    <input
                      type="hidden"
                      name="action"
                      value="CHANGES_REQUESTED"
                    />
                    <label className="field">
                      <span>O que precisa ser alterado?</span>
                      <textarea
                        name="message"
                        rows={3}
                        maxLength={4000}
                        required
                      />
                    </label>
                    <button
                      className="button button-primary button-wide"
                      type="submit"
                    >
                      Solicitar alteração
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </article>
        </div>
      ) : null}
    </main>
  );
}
