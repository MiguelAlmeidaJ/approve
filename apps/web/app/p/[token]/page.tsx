import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FiCheck,
  FiGrid,
  FiHeart,
  FiMessageCircle,
  FiMoreHorizontal,
  FiPlay,
  FiSend,
  FiSmartphone
} from "react-icons/fi";
import { Brand } from "../../../components/brand";
import { requireClientAccount } from "../../../lib/client-auth";
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

function PublicArt({
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
      <div className={`ig-art has-image ${className}`}>
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
      <div className={`ig-art has-image ${className}`}>
        <img src={item.assetUrl} alt={item.title} />
      </div>
    );
  }

  return (
    <div className={`ig-art ig-art-tone-${index % 3} ${className}`}>
      <span>TERCEIRO ANDAR</span>
      <strong>{item.title}</strong>
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
  const account = await requireClientAccount();
  const { token } = await params;
  const { item: selectedId } = await searchParams;
  const calendar = await getPublicCalendar(token);

  if (!calendar || calendar.client.id !== account.id) {
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
  const stories = calendar.contentItems.filter(
    (item) => item.publishToStories
  );
  const feedItems = calendar.contentItems.filter(
    (item) => item.publishToFeed
  );

  return (
    <main className="instagram-preview-page">
      <header className="instagram-preview-topbar">
        <Brand />
        <div>
          <span>Prévia do perfil</span>
          <Link href="/cliente">Voltar aos calendários</Link>
        </div>
      </header>

      <section className="instagram-profile">
        <div className="instagram-profile-avatar">
          <span>{calendar.client.name.slice(0, 2).toUpperCase()}</span>
        </div>

        <div className="instagram-profile-info">
          <div className="instagram-profile-title">
            <h1>{calendar.client.slug.replaceAll("-", "_")}</h1>
            <span className="instagram-calendar-chip">{calendar.title}</span>
          </div>

          <div className="instagram-stats">
            <span><strong>{feedItems.length}</strong> publicações</span>
            <span><strong>{approved}</strong> aprovadas</span>
            <span><strong>{calendar.contentItems.length - approved}</strong> pendentes</span>
          </div>

          <div className="instagram-bio">
            <strong>{calendar.client.name}</strong>
            <span>{calendar.client.niche ?? "Conteúdo planejado pela Terceiro Andar"}</span>
            <p>
              Prévia visual para aprovação. Clique em qualquer peça para abrir
              detalhes, legenda e ações.
            </p>
          </div>
        </div>
      </section>

      {stories.length > 0 ? (
        <section className="instagram-stories" aria-label="Stories planejados">
          {stories.map((item, index) => (
            <Link
              href={`/p/${token}?item=${item.id}`}
              className="instagram-story"
              key={item.id}
            >
              <span className="instagram-story-ring">
                <span>
                  {item.assets?.[0] ? (
                    item.assets[0].mimeType?.startsWith("video/") ? (
                      <FiPlay aria-hidden="true" />
                    ) : (
                      <img
                        src={`/api/media/${item.assets[0].id}`}
                        alt=""
                      />
                    )
                  ) : item.assetUrl ? (
                    <img src={item.assetUrl} alt="" />
                  ) : (
                    <FiSmartphone aria-hidden="true" />
                  )}
                </span>
              </span>
              <strong>{item.title}</strong>
            </Link>
          ))}
        </section>
      ) : null}

      <div className="instagram-tabs">
        <span className="active"><FiGrid /> PUBLICAÇÕES</span>
        <span><FiPlay /> REELS</span>
      </div>

      {feedItems.length === 0 ? (
        <div className="instagram-empty">
          Nenhuma peça foi marcada para aparecer no feed.
        </div>
      ) : (
        <section className="instagram-feed-grid">
          {feedItems.map((item, index) => (
            <Link
              href={`/p/${token}?item=${item.id}`}
              className="instagram-feed-tile"
              key={item.id}
            >
              <PublicArt item={item} index={index} />
              {item.contentType === "REEL" ? (
                <FiPlay className="instagram-tile-type" aria-hidden="true" />
              ) : null}
              {item.contentType === "CAROUSEL" ? (
                <span className="instagram-carousel-mark">▣</span>
              ) : null}
              <span className="instagram-tile-overlay">
                <span><FiHeart /> {item.status === "APPROVED" ? "Aprovado" : "Revisar"}</span>
                <span><FiMessageCircle /> Abrir</span>
              </span>
            </Link>
          ))}
        </section>
      )}

      <footer className="instagram-preview-footer">
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
          <article className="instagram-post-modal">
            <div className="instagram-post-media">
              {selectedItem.assets?.length > 1 ? (
                <div className="instagram-carousel-media">
                  {selectedItem.assets.map((asset) => (
                    <div className="instagram-carousel-slide" key={asset.id}>
                      {asset.mimeType?.startsWith("video/") ? (
                        <video
                          src={`/api/media/${asset.id}`}
                          controls
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={`/api/media/${asset.id}`}
                          alt={selectedItem.title}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <PublicArt
                  item={selectedItem}
                  index={Math.max(selectedIndex, 0)}
                  className="instagram-post-art"
                />
              )}
            </div>

            <div className="instagram-post-panel">
              <header className="instagram-post-account">
                <span className="instagram-post-avatar">
                  {calendar.client.name.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <strong>{calendar.client.slug.replaceAll("-", "_")}</strong>
                  <small>
                    {selectedItem.publishToFeed ? "Feed" : ""}
                    {selectedItem.publishToFeed && selectedItem.publishToStories
                      ? " + "
                      : ""}
                    {selectedItem.publishToStories ? "Stories" : ""}
                  </small>
                </div>
                <FiMoreHorizontal aria-hidden="true" />
                <Link href={`/p/${token}`} className="instagram-modal-close">
                  ×
                </Link>
              </header>

              <div className="instagram-post-caption">
                <p>
                  <strong>{calendar.client.slug.replaceAll("-", "_")}</strong>{" "}
                  {selectedItem.caption}
                </p>

                {latestReview?.message ? (
                  <div className="instagram-last-feedback">
                    <span>Último ajuste solicitado</span>
                    <p>{latestReview.message}</p>
                  </div>
                ) : null}
              </div>

              <div className="instagram-post-icons">
                <FiHeart />
                <FiMessageCircle />
                <FiSend />
                <span className={`status-pill status-${selectedItem.status.toLowerCase()}`}>
                  {statusText[selectedItem.status]}
                </span>
              </div>

              <div className="instagram-approval-panel">
                <form action={submitReview}>
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="itemId" value={selectedItem.id} />
                  <input type="hidden" name="action" value="APPROVED" />
                  <input type="hidden" name="reviewerName" value={account.name} />
                  <button
                    className="button button-dark button-wide"
                    type="submit"
                    disabled={selectedItem.status === "APPROVED"}
                  >
                    <FiCheck aria-hidden="true" />
                    {selectedItem.status === "APPROVED"
                      ? "Conteúdo aprovado"
                      : "Aprovar conteúdo"}
                  </button>
                </form>

                <form action={submitReview} className="approval-form">
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="itemId" value={selectedItem.id} />
                  <input type="hidden" name="action" value="CHANGES_REQUESTED" />
                  <input type="hidden" name="reviewerName" value={account.name} />
                  <label className="field">
                    <span>Solicitar alteração</span>
                    <textarea
                      name="message"
                      rows={3}
                      maxLength={4000}
                      placeholder="Explique o que precisa ser ajustado..."
                      required
                    />
                  </label>
                  <button
                    className="button button-primary button-wide"
                    type="submit"
                  >
                    Enviar solicitação
                  </button>
                </form>
              </div>
            </div>
          </article>
        </div>
      ) : null}
    </main>
  );
}
