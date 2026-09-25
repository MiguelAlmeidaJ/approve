import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FiArrowLeft,
  FiBarChart2,
  FiCheckCircle,
  FiClock,
  FiEdit3,
  FiImage,
  FiMessageCircle,
  FiRefreshCw,
  FiSend
} from "react-icons/fi";
import { AppShell } from "../../../../../components/app-shell";
import {
  addContentComment,
  updateContentMetrics
} from "../../../../actions";
import { requireDesigner } from "../../../../../lib/auth";
import {
  canAccessClient,
  getArtworkVersions,
  getCalendar
} from "../../../../../lib/api";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo"
  }).format(new Date(value));
}

export default async function ContentDetailPage({
  params
}: {
  params: Promise<{ calendarId: string; itemId: string }>;
}) {
  const { calendarId, itemId } = await params;
  const designer = await requireDesigner();
  const [calendar, versions] = await Promise.all([
    getCalendar(calendarId),
    getArtworkVersions(itemId)
  ]);

  if (!calendar || !canAccessClient(designer, calendar.client)) {
    notFound();
  }

  const item = calendar.contentItems.find((entry) => entry.id === itemId);

  if (!item) {
    notFound();
  }

  const groupedVersions = new Map<number, NonNullable<typeof versions>["assets"]>();
  for (const asset of versions?.assets ?? []) {
    const version = asset.version ?? 1;
    groupedVersions.set(version, [...(groupedVersions.get(version) ?? []), asset]);
  }
  const versionEntries = [...groupedVersions.entries()].sort(
    (a, b) => b[0] - a[0]
  );
  const canEditMetrics =
    (designer.role === "ADMIN" || designer.role === "DEV") &&
    item.stage === "PUBLISHED";

  return (
    <AppShell designer={designer} activeSection="calendars">
      <header className="page-header compact-header content-detail-header">
        <div>
          <Link href={`/calendars/${calendar.id}`} className="back-link">
            <FiArrowLeft aria-hidden="true" />
            {calendar.title}
          </Link>
          <span className="micro-label">PEÇA DO CALENDÁRIO</span>
          <h1>{item.title}</h1>
          <p>{item.headline || item.theme || "Conteúdo do planejamento"}</p>
        </div>

        {calendar.stage === "PRODUCTION" &&
        ["DESIGN_PENDING", "DESIGN_IN_PROGRESS", "ART_CHANGES_REQUESTED"].includes(
          item.stage
        ) ? (
          <Link
            href={`/calendars/${calendar.id}/content/${item.id}/artwork`}
            className="button button-primary"
          >
            <FiEdit3 />
            Trabalhar arte
          </Link>
        ) : null}
      </header>

      <section className="content-detail-grid">
        <div className="content-detail-main">
          <section className="content-detail-card">
            <div className="content-detail-card-head">
              <div>
                <span className="micro-label">BRIEFING</span>
                <h2>Planejamento aprovado</h2>
              </div>
              <span className="workflow-status neutral">{item.stage.replaceAll("_", " ")}</span>
            </div>
            <div className="content-detail-brief-grid">
              <div><small>Tema</small><strong>{item.theme || "—"}</strong></div>
              <div><small>Headline</small><strong>{item.headline || "—"}</strong></div>
              <div><small>Subheadline</small><strong>{item.subheadline || "—"}</strong></div>
              <div><small>Formato</small><strong>{item.format}</strong></div>
            </div>
            <div className="content-detail-text">
              <small>Legenda</small>
              <p>{item.caption}</p>
            </div>
            {item.designerNotes ? (
              <div className="content-detail-text">
                <small>Orientações para o design</small>
                <p>{item.designerNotes}</p>
              </div>
            ) : null}
          </section>

          <section className="content-detail-card">
            <div className="content-detail-card-head">
              <div>
                <span className="micro-label">CONVERSA</span>
                <h2>Comentários da peça</h2>
              </div>
              <FiMessageCircle aria-hidden="true" />
            </div>

            <div className="content-thread">
              {(item.comments ?? []).length === 0 ? (
                <div className="content-thread-empty">
                  Nenhum comentário interno ou do cliente ainda.
                </div>
              ) : (
                item.comments?.map((comment) => (
                  <article
                    className={`content-comment comment-${comment.authorType.toLowerCase()}`}
                    key={comment.id}
                  >
                    <div>
                      <strong>
                        {comment.authorDesigner?.name ||
                          comment.authorName ||
                          (comment.authorType === "CLIENT" ? "Cliente" : "Sistema")}
                      </strong>
                      <small>{formatDate(comment.createdAt)}</small>
                    </div>
                    <p>{comment.message}</p>
                  </article>
                ))
              )}
            </div>

            <form action={addContentComment} className="content-comment-form">
              <input type="hidden" name="calendarId" value={calendar.id} />
              <input type="hidden" name="itemId" value={item.id} />
              <textarea
                name="message"
                rows={3}
                placeholder="Adicione uma observação para a equipe..."
                required
              />
              <label className="content-comment-visibility">
                <input type="checkbox" name="visibleToClient" />
                <span>Mostrar este comentário ao cliente no link de aprovação</span>
              </label>
              <button type="submit" className="button button-dark button-small">
                <FiSend />
                Comentar
              </button>
            </form>
          </section>

          {item.reviews && item.reviews.length > 0 ? (
            <section className="content-detail-card">
              <div className="content-detail-card-head">
                <div>
                  <span className="micro-label">HISTÓRICO</span>
                  <h2>Aprovações do cliente</h2>
                </div>
              </div>
              <div className="approval-history-list">
                {item.reviews.map((review) => (
                  <article key={review.id}>
                    <span>
                      {review.action === "APPROVED" ? (
                        <FiCheckCircle />
                      ) : (
                        <FiRefreshCw />
                      )}
                    </span>
                    <div>
                      <strong>
                        {review.phase === "PLANNING" ? "Planejamento" : "Arte"} ·{" "}
                        {review.action === "APPROVED"
                          ? "Aprovado"
                          : "Alteração solicitada"}
                      </strong>
                      <small>
                        {review.reviewerName || "Cliente"} · {formatDate(review.createdAt)}
                      </small>
                      {review.message ? <p>{review.message}</p> : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="content-detail-side">
          <section className="content-detail-card">
            <div className="content-detail-card-head">
              <div>
                <span className="micro-label">VERSÕES</span>
                <h2>Histórico de arte</h2>
              </div>
              <span>V{item.artworkVersion}</span>
            </div>

            {versionEntries.length === 0 ? (
              <div className="version-empty">
                <FiImage />
                <span>Nenhuma arte enviada.</span>
              </div>
            ) : (
              <div className="art-version-list">
                {versionEntries.map(([version, assets]) => (
                  <article className="art-version" key={version}>
                    <div>
                      <strong>Versão {version}</strong>
                      <span>{assets[0]?.active ? "Atual" : "Anterior"}</span>
                    </div>
                    <div className="art-version-assets">
                      {assets.map((asset) =>
                        asset.mimeType?.startsWith("image/") ? (
                          <img
                            src={`/api/media/${asset.id}`}
                            alt={asset.fileName || `Arte versão ${version}`}
                            key={asset.id}
                          />
                        ) : (
                          <a
                            href={`/api/media/${asset.id}`}
                            target="_blank"
                            rel="noreferrer"
                            key={asset.id}
                          >
                            Vídeo · {asset.fileName || "arquivo"}
                          </a>
                        )
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="content-detail-card">
            <div className="content-detail-card-head">
              <div>
                <span className="micro-label">DESEMPENHO</span>
                <h2>Métricas</h2>
              </div>
              <FiBarChart2 />
            </div>

            <div className="content-metrics-grid">
              <div><small>Alcance</small><strong>{item.metricReach ?? 0}</strong></div>
              <div><small>Impressões</small><strong>{item.metricImpressions ?? 0}</strong></div>
              <div><small>Curtidas</small><strong>{item.metricLikes ?? 0}</strong></div>
              <div><small>Comentários</small><strong>{item.metricComments ?? 0}</strong></div>
              <div><small>Compart.</small><strong>{item.metricShares ?? 0}</strong></div>
              <div><small>Salvamentos</small><strong>{item.metricSaves ?? 0}</strong></div>
            </div>

            {canEditMetrics ? (
              <form action={updateContentMetrics} className="metrics-form">
                <input type="hidden" name="calendarId" value={calendar.id} />
                <input type="hidden" name="itemId" value={item.id} />
                <div>
                  <label>Alcance<input type="number" min="0" name="reach" defaultValue={item.metricReach ?? ""} /></label>
                  <label>Impressões<input type="number" min="0" name="impressions" defaultValue={item.metricImpressions ?? ""} /></label>
                  <label>Curtidas<input type="number" min="0" name="likes" defaultValue={item.metricLikes ?? ""} /></label>
                  <label>Comentários<input type="number" min="0" name="comments" defaultValue={item.metricComments ?? ""} /></label>
                  <label>Compart.<input type="number" min="0" name="shares" defaultValue={item.metricShares ?? ""} /></label>
                  <label>Salvamentos<input type="number" min="0" name="saves" defaultValue={item.metricSaves ?? ""} /></label>
                </div>
                <button type="submit" className="button button-primary button-wide">
                  Salvar métricas
                </button>
              </form>
            ) : (
              <p className="metrics-note">
                {item.stage === "PUBLISHED"
                  ? "Somente Admin/Dev podem editar as métricas."
                  : "As métricas ficam disponíveis após a publicação."}
              </p>
            )}
          </section>

          <section className="content-detail-card content-detail-meta">
            <div><FiClock /><span>Programado para<strong>{formatDate(item.scheduledAt)}</strong></span></div>
            <div><FiImage /><span>Versão atual<strong>V{item.artworkVersion || "—"}</strong></span></div>
          </section>
        </aside>
      </section>
    </AppShell>
  );
}
