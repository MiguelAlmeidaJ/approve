import { notFound } from "next/navigation";
import { Brand } from "../../../components/brand";
import { getPublicCalendar } from "../../../lib/api";
import { submitReview } from "./actions";

const statusText = {
  DRAFT: "Rascunho",
  PENDING_APPROVAL: "Aguardando aprovação",
  APPROVED: "Aprovado",
  CHANGES_REQUESTED: "Alteração solicitada"
} as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo"
  }).format(new Date(value));
}

export default async function ApprovalPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const calendar = await getPublicCalendar(token);

  if (!calendar) {
    notFound();
  }

  const approved = calendar.contentItems.filter(
    (item) => item.status === "APPROVED"
  ).length;

  return (
    <main className="public-shell">
      <header className="public-header">
        <Brand />
        <span className="public-label">APROVAÇÃO DE CONTEÚDO</span>
      </header>

      <section className="public-intro">
        <div>
          <span className="eyebrow eyebrow-light">{calendar.client.name}</span>
          <h1>{calendar.title}</h1>
          <p>
            Revise cada peça abaixo. Você pode aprovar ou enviar um comentário
            objetivo para alteração.
          </p>
        </div>
        <div className="approval-count">
          <strong>
            {approved}/{calendar.contentItems.length}
          </strong>
          <span>aprovados</span>
        </div>
      </section>

      <section className="approval-grid">
        {calendar.contentItems.map((item, index) => {
          const latestReview = item.reviews?.[0];

          return (
            <article className="approval-card" key={item.id}>
              <div className="approval-card-head">
                <span className="content-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <span className="content-meta">
                    {item.channel} · {item.format}
                  </span>
                  <h2>{item.title}</h2>
                  <span className="content-date">
                    {formatDate(item.scheduledAt)}
                  </span>
                </div>
                <span
                  className={`status status-${item.status.toLowerCase()}`}
                >
                  {statusText[item.status]}
                </span>
              </div>

              {item.assetUrl ? (
                <div className="asset-frame">
                  {/* URL externa é informada pela agência. */}
                  <img src={item.assetUrl} alt={item.title} />
                </div>
              ) : (
                <div className="asset-placeholder">
                  <span>ARTE</span>
                  <strong>Preview ainda não anexado</strong>
                </div>
              )}

              <div className="caption-box">
                <span>LEGENDA</span>
                <p>{item.caption}</p>
              </div>

              {latestReview?.message ? (
                <div className="latest-feedback">
                  <strong>Último comentário</strong>
                  <p>{latestReview.message}</p>
                </div>
              ) : null}

              <div className="review-actions">
                <form action={submitReview} className="approve-form">
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="itemId" value={item.id} />
                  <input type="hidden" name="action" value="APPROVED" />
                  <input
                    name="reviewerName"
                    placeholder="Seu nome (opcional)"
                    maxLength={120}
                  />
                  <button
                    className="approve-button"
                    type="submit"
                    disabled={item.status === "APPROVED"}
                  >
                    {item.status === "APPROVED"
                      ? "Conteúdo aprovado"
                      : "Aprovar conteúdo"}
                  </button>
                </form>

                <form action={submitReview} className="change-form">
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="itemId" value={item.id} />
                  <input
                    type="hidden"
                    name="action"
                    value="CHANGES_REQUESTED"
                  />
                  <input
                    name="reviewerName"
                    placeholder="Seu nome (opcional)"
                    maxLength={120}
                  />
                  <textarea
                    name="message"
                    rows={3}
                    maxLength={4000}
                    placeholder="O que precisa ser alterado?"
                    required
                  />
                  <button className="change-button" type="submit">
                    Solicitar alteração
                  </button>
                </form>
              </div>
            </article>
          );
        })}
      </section>

      <footer className="public-footer">
        <Brand />
        <p>Terceiro Andar · Conteúdo, design e aprovação no mesmo fluxo.</p>
      </footer>
    </main>
  );
}
