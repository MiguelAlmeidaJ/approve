import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FiCalendar,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiGrid,
  FiHeart,
  FiMessageCircle,
  FiMoreHorizontal,
  FiPlay,
  FiSend,
  FiSmartphone
} from "react-icons/fi";
import { Brand } from "../../../components/brand";
import { PublicArtworkReviewer } from "../../../components/public-artwork-reviewer";
import { PublicReviewActions } from "../../../components/public-review-actions";
import {
  ProtectedPublicImage,
  ProtectedPublicVideo
} from "../../../components/protected-public-media";
import { getClientAccount } from "../../../lib/client-auth";
import {
  type ContentItem,
  getPublicCalendar
} from "../../../lib/api";

export const metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true
  },
  referrer: "no-referrer"
};

const statusText = {
  DRAFT: "Em produção",
  PENDING_APPROVAL: "Aguardando aprovação",
  APPROVED: "Aprovado",
  CHANGES_REQUESTED: "Alteração solicitada"
} as const;

function publicMediaUrl(assetId: string, token: string) {
  return `/api/media/${assetId}?share=${encodeURIComponent(token)}`;
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

function typeLabel(item: ContentItem) {
  const type = {
    POST: "Post",
    CAROUSEL: "Carrossel",
    REEL: "Reels",
    STORY: "Stories"
  }[item.contentType];

  const placements = [
    item.publishToFeed ? "Feed" : "",
    item.publishToStories ? "Stories" : ""
  ].filter(Boolean);

  return `${type} · ${placements.join(" + ")}`;
}

function planningStageLabel(item: ContentItem) {
  if (item.stage === "PRE_APPROVED" || item.stage === "DESIGN_PENDING") {
    return "Aprovado";
  }

  if (item.stage === "PRE_CHANGES_REQUESTED") {
    return "Ajuste solicitado";
  }

  if (item.stage === "DESIGN_IN_PROGRESS") {
    return "Em produção";
  }

  return "Aguardando aprovação";
}

function PublicArt({
  item,
  index,
  token,
  className = "",
  videoControls = false
}: {
  item: ContentItem;
  index: number;
  token: string;
  className?: string;
  videoControls?: boolean;
}) {
  const primaryAsset = item.assets?.[0];

  if (primaryAsset) {
    const src = publicMediaUrl(primaryAsset.id, token);

    return (
      <div className={`ig-art has-image ${className}`}>
        {primaryAsset.mimeType?.startsWith("video/") ? (
          <ProtectedPublicVideo src={src} controls={videoControls} />
        ) : (
          <ProtectedPublicImage src={src} alt={item.title} />
        )}
      </div>
    );
  }

  if (item.assetUrl) {
    return (
      <div className={`ig-art has-image ${className}`}>
        <ProtectedPublicImage src={item.assetUrl} alt={item.title} />
      </div>
    );
  }

  return (
    <div className={`ig-art ig-art-tone-${index % 3} ${className}`}>
      <span>TERCEIRO ANDAR</span>
      <strong>{item.headline || item.title}</strong>
    </div>
  );
}

function PlanningApprovalView({
  token,
  calendar,
  defaultName
}: {
  token: string;
  calendar: NonNullable<Awaited<ReturnType<typeof getPublicCalendar>>>;
  defaultName?: string;
}) {
  const approving = calendar.stage === "PRE_APPROVAL";
  const approved = calendar.contentItems.filter((item) =>
    ["PRE_APPROVED", "DESIGN_PENDING", "DESIGN_IN_PROGRESS"].includes(
      item.stage
    )
  ).length;
  const pendingPlanningItems = calendar.contentItems.filter((item) =>
    ["PRE_APPROVAL_PENDING", "PRE_CHANGES_REQUESTED"].includes(item.stage)
  );

  return (
    <main className="planning-public-page">
      <header className="planning-public-topbar">
        <Brand />
        <div>
          <span>Pré-calendário · {calendar.client.name}</span>
          <small>{calendar.title}</small>
        </div>
      </header>

      <section className="planning-public-hero">
        <div>
          <span className="micro-label">
            {approving ? "APROVAÇÃO DE PLANEJAMENTO" : "PLANEJAMENTO APROVADO"}
          </span>
          <h1>{calendar.title}</h1>
          <p>
            {approving
              ? "Revise tema, textos, legenda e datas antes de a equipe iniciar a produção das artes."
              : "O pré-calendário foi aprovado e a equipe está produzindo as artes."}
          </p>
        </div>
        <div className="planning-public-progress">
          <strong>
            {approved}/{calendar.contentItems.length}
          </strong>
          <span>briefings aprovados</span>
        </div>
      </section>

      <section className="planning-public-list">
        {calendar.contentItems.map((item, index) => {
          const latestPlanningReview = item.reviews?.find(
            (review) => review.phase === "PLANNING"
          );
          const canReview =
            approving &&
            ["PRE_APPROVAL_PENDING", "PRE_CHANGES_REQUESTED"].includes(
              item.stage
            );
          const itemApproved = [
            "PRE_APPROVED",
            "DESIGN_PENDING",
            "DESIGN_IN_PROGRESS"
          ].includes(item.stage);

          return (
            <article className="planning-public-card" key={item.id}>
              <div className="planning-public-card-index">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{formatDate(item.scheduledAt)}</strong>
                  <small>
                    <FiClock aria-hidden="true" />
                    {formatTime(item.scheduledAt)}
                  </small>
                </div>
              </div>

              <div className="planning-public-card-head">
                <div>
                  <span className="planning-public-type">{typeLabel(item)}</span>
                  <h2>{item.title}</h2>
                </div>
                <span
                  className={[
                    "workflow-status",
                    item.stage === "PRE_CHANGES_REQUESTED"
                      ? "danger"
                      : itemApproved
                        ? "success"
                        : "warning"
                  ].join(" ")}
                >
                  {planningStageLabel(item)}
                </span>
              </div>

              <div className="planning-public-copy-grid">
                <div>
                  <small>Tema</small>
                  <p>{item.theme || "—"}</p>
                </div>
                <div>
                  <small>Headline</small>
                  <p>{item.headline || "—"}</p>
                </div>
                <div>
                  <small>Subheadline</small>
                  <p>{item.subheadline || "—"}</p>
                </div>
                <div className="planning-public-caption">
                  <small>Legenda</small>
                  <p>{item.caption}</p>
                </div>
              </div>

              {latestPlanningReview?.message ? (
                <div className="planning-public-feedback">
                  <strong>Último feedback</strong>
                  <p>{latestPlanningReview.message}</p>
                </div>
              ) : null}

              {canReview ? (
                <PublicReviewActions
                  token={token}
                  itemId={item.id}
                  defaultName={defaultName}
                  approved={false}
                  phase="planning"
                  reviewedIndex={
                    pendingPlanningItems.findIndex(
                      (entry) => entry.id === item.id
                    ) + 1
                  }
                  reviewTotal={pendingPlanningItems.length}
                  nextItemId={
                    pendingPlanningItems[
                      pendingPlanningItems.findIndex(
                        (entry) => entry.id === item.id
                      ) + 1
                    ]?.id
                  }
                />
              ) : itemApproved ? (
                <div className="planning-public-approved-note">
                  <FiCheck aria-hidden="true" />
                  Briefing aprovado
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      <footer className="planning-public-footer">
        <Brand />
        <span>Terceiro Andar · Planejamento de conteúdo</span>
      </footer>
    </main>
  );
}

export default async function ApprovalPage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ item?: string }>;
}) {
  const account = await getClientAccount();
  const { token } = await params;
  const { item: selectedId } = await searchParams;
  const calendar = await getPublicCalendar(token);

  if (!calendar) {
    notFound();
  }

  const initialProduction =
    calendar.stage === "PRODUCTION" &&
    !calendar.contentItems.some((item) =>
      [
        "ART_APPROVAL_PENDING",
        "ART_CHANGES_REQUESTED",
        "ART_APPROVED",
        "READY_TO_SCHEDULE",
        "SCHEDULED",
        "PUBLISHED",
        "SCHEDULING_ERROR"
      ].includes(item.stage)
    );

  if (calendar.stage === "PRE_APPROVAL" || initialProduction) {
    return (
      <PlanningApprovalView
        token={token}
        calendar={calendar}
        defaultName={account?.name}
      />
    );
  }

  const selectedIndex = calendar.contentItems.findIndex(
    (item) => item.id === selectedId
  );
  const selectedItem =
    selectedIndex >= 0 ? calendar.contentItems[selectedIndex] : null;
  const latestArtworkReview = selectedItem?.reviews?.find(
    (review) => review.phase === "ARTWORK"
  );
  const approved = calendar.contentItems.filter((item) =>
    [
      "ART_APPROVED",
      "READY_TO_SCHEDULE",
      "SCHEDULED",
      "PUBLISHED"
    ].includes(item.stage)
  ).length;
  const stories = calendar.contentItems.filter(
    (item) => item.publishToStories
  );
  const feedItems = calendar.contentItems.filter(
    (item) => item.publishToFeed
  );
  const canReviewArtwork = calendar.stage === "FINAL_APPROVAL";
  const artworkReviewQueue = calendar.contentItems.filter((item) =>
    ["ART_APPROVAL_PENDING", "ART_CHANGES_REQUESTED"].includes(item.stage)
  );
  const artworkQueueIndex = selectedItem
    ? artworkReviewQueue.findIndex((item) => item.id === selectedItem.id)
    : -1;
  const previousArtworkItem =
    artworkQueueIndex > 0 ? artworkReviewQueue[artworkQueueIndex - 1] : null;
  const nextArtworkItem =
    artworkQueueIndex >= 0
      ? artworkReviewQueue[artworkQueueIndex + 1] ?? null
      : null;

  return (
    <main className="instagram-preview-page">
      <header className="instagram-preview-topbar">
        <Brand />
        <div>
          <span>
            {canReviewArtwork
              ? "Aprovação final das artes"
              : calendar.stage === "PRODUCTION"
                ? "Ajustes de arte em produção"
                : "Calendário aprovado"}
          </span>
          {account ? (
            <Link href="/cliente">Meus calendários</Link>
          ) : (
            <Link href={`/cliente/login?next=${encodeURIComponent("/cliente")}`}>
              Entrar para ver históricos
            </Link>
          )}
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
            <span>
              <strong>{feedItems.length}</strong> publicações
            </span>
            <span>
              <strong>{approved}</strong> aprovadas
            </span>
            <span>
              <strong>{calendar.contentItems.length - approved}</strong>{" "}
              pendentes
            </span>
          </div>

          <div className="instagram-bio">
            <strong>{calendar.client.name}</strong>
            <span>
              {calendar.client.niche ??
                "Conteúdo planejado pela Terceiro Andar"}
            </span>
            <p>
              {canReviewArtwork
                ? "Clique em qualquer peça para revisar a arte, a legenda e aprovar a versão final."
                : "As artes estão em ajuste ou já seguiram para a etapa de programação."}
            </p>
          </div>
        </div>
      </section>

      {stories.length > 0 ? (
        <section className="instagram-stories" aria-label="Stories planejados">
          {stories.map((item) => (
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
                      <ProtectedPublicImage
                        src={publicMediaUrl(item.assets[0].id, token)}
                        alt=""
                      />
                    )
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
        <span className="active">
          <FiGrid /> PUBLICAÇÕES
        </span>
        <span>
          <FiPlay /> REELS
        </span>
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
              <PublicArt item={item} index={index} token={token} />
              {item.contentType === "REEL" ? (
                <FiPlay className="instagram-tile-type" aria-hidden="true" />
              ) : null}
              {item.contentType === "CAROUSEL" ? (
                <span className="instagram-carousel-mark">▣</span>
              ) : null}
              <span className="instagram-tile-overlay">
                <span>
                  <FiHeart />{" "}
                  {[
                    "ART_APPROVED",
                    "READY_TO_SCHEDULE",
                    "SCHEDULED",
                    "PUBLISHED"
                  ].includes(item.stage)
                    ? "Aprovado"
                    : "Revisar"}
                </span>
                <span>
                  <FiMessageCircle /> Abrir
                </span>
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
              {selectedItem.assets?.length > 0 ? (
                <PublicArtworkReviewer
                  token={token}
                  item={selectedItem}
                  defaultName={account?.name}
                  canAnnotate={
                    canReviewArtwork &&
                    ["ART_APPROVAL_PENDING", "ART_CHANGES_REQUESTED"].includes(
                      selectedItem.stage
                    )
                  }
                />
              ) : (
                <PublicArt
                  item={selectedItem}
                  index={Math.max(selectedIndex, 0)}
                  token={token}
                  className="instagram-post-art"
                  videoControls
                />
              )}
            </div>

            <div className="instagram-post-panel">
              <header className="instagram-post-account">
                <span className="instagram-post-avatar">
                  {calendar.client.name.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <strong>
                    {calendar.client.slug.replaceAll("-", "_")}
                  </strong>
                  <small>{typeLabel(selectedItem)}</small>
                </div>
                <FiMoreHorizontal aria-hidden="true" />
                <Link
                  href={`/p/${token}`}
                  className="instagram-modal-close"
                >
                  ×
                </Link>
              </header>

              {artworkReviewQueue.length > 1 && artworkQueueIndex >= 0 ? (
                <nav className="public-piece-navigation" aria-label="Navegar entre peças">
                  {previousArtworkItem ? (
                    <Link
                      href={`/p/${token}?item=${previousArtworkItem.id}`}
                      aria-label="Peça anterior"
                    >
                      <FiChevronLeft />
                      Anterior
                    </Link>
                  ) : (
                    <span />
                  )}
                  <strong>
                    {artworkQueueIndex + 1} de {artworkReviewQueue.length}
                  </strong>
                  {nextArtworkItem ? (
                    <Link
                      href={`/p/${token}?item=${nextArtworkItem.id}`}
                      aria-label="Próxima peça"
                    >
                      Próxima
                      <FiChevronRight />
                    </Link>
                  ) : (
                    <span />
                  )}
                </nav>
              ) : null}

              <div className="instagram-post-caption">
                <p>
                  <strong>
                    {calendar.client.slug.replaceAll("-", "_")}
                  </strong>{" "}
                  {selectedItem.caption}
                </p>

                {latestArtworkReview?.message ? (
                  <div className="instagram-last-feedback">
                    <span>Último ajuste solicitado</span>
                    <p>{latestArtworkReview.message}</p>
                  </div>
                ) : null}

                {selectedItem.comments && selectedItem.comments.length > 0 ? (
                  <div className="public-comment-thread">
                    <strong>Conversa sobre esta peça</strong>
                    {selectedItem.comments.map((comment) => (
                      <div
                        className={`public-comment public-comment-${comment.authorType.toLowerCase()}`}
                        key={comment.id}
                      >
                        <span>{comment.authorName || "Equipe"}</span>
                        <p>{comment.message}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="instagram-post-icons">
                <FiHeart />
                <FiMessageCircle />
                <FiSend />
                <span
                  className={`status-pill status-${selectedItem.status.toLowerCase()}`}
                >
                  {statusText[selectedItem.status]}
                </span>
              </div>

              <div className="instagram-approval-panel compact">
                {canReviewArtwork &&
                [
                  "ART_APPROVAL_PENDING",
                  "ART_CHANGES_REQUESTED"
                ].includes(selectedItem.stage) ? (
                  <PublicReviewActions
                    token={token}
                    itemId={selectedItem.id}
                    defaultName={account?.name}
                    approved={false}
                    phase="artwork"
                    reviewedIndex={
                      artworkQueueIndex >= 0 ? artworkQueueIndex + 1 : undefined
                    }
                    reviewTotal={artworkReviewQueue.length}
                    nextItemId={nextArtworkItem?.id}
                  />
                ) : (
                  <div className="public-review-locked">
                    <FiCheck aria-hidden="true" />
                    <span>
                      {[
                        "ART_APPROVED",
                        "READY_TO_SCHEDULE",
                        "SCHEDULED",
                        "PUBLISHED"
                      ].includes(selectedItem.stage)
                        ? "Arte aprovada"
                        : "Esta peça não está disponível para revisão agora."}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </article>
        </div>
      ) : null}
    </main>
  );
}
