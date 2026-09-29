import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiImage,
  FiPlus,
  FiRefreshCw
} from "react-icons/fi";
import { createStandaloneArtwork } from "../actions";
import { AppShell } from "../../components/app-shell";
import { StandaloneArtworkStatusForm } from "../../components/standalone-artwork-status";
import { requireDesigner } from "../../lib/auth";
import {
  getAccessibleClients,
  getDesigners,
  getStandaloneArtworks,
  type StandaloneArtworkStatus
} from "../../lib/api";

const statusLabels: Record<StandaloneArtworkStatus, string> = {
  REQUESTED: "Solicitada",
  IN_PRODUCTION: "Em produção",
  IN_APPROVAL: "Em aprovação",
  CHANGES_REQUESTED: "Ajustes solicitados",
  APPROVED: "Aprovada",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelada"
};

const priorityLabels = {
  LOW: "Baixa",
  NORMAL: "Normal",
  HIGH: "Alta",
  URGENT: "Urgente"
} as const;

function dateLabel(value: string | null) {
  if (!value) return "Sem prazo";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export default async function StandaloneArtworksPage() {
  const designer = await requireDesigner();
  const [clients, designers, artworks] = await Promise.all([
    getAccessibleClients(designer),
    designer.role === "DESIGNER" ? Promise.resolve([]) : getDesigners(),
    getStandaloneArtworks()
  ]);

  const open = artworks.filter(
    (artwork) => !["DELIVERED", "CANCELLED"].includes(artwork.status)
  );
  const overdue = open.filter(
    (artwork) => artwork.dueAt && new Date(artwork.dueAt) < new Date()
  );
  const inApproval = open.filter((artwork) => artwork.status === "IN_APPROVAL");
  const delivered = artworks.filter((artwork) => artwork.status === "DELIVERED");

  return (
    <AppShell designer={designer} activeSection="standalone">
      <header className="page-header">
        <div>
          <span className="micro-label">OPERAÇÃO</span>
          <h1>Artes avulsas</h1>
          <p>
            Demandas fora do calendário, com responsável, prazo, pontuação e
            acompanhamento do fluxo de produção.
          </p>
        </div>
      </header>

      <section className="standalone-kpis">
        <article>
          <FiImage />
          <div><small>Em aberto</small><strong>{open.length}</strong></div>
        </article>
        <article>
          <FiClock />
          <div><small>Em aprovação</small><strong>{inApproval.length}</strong></div>
        </article>
        <article>
          <FiAlertCircle />
          <div><small>Atrasadas</small><strong>{overdue.length}</strong></div>
        </article>
        <article>
          <FiCheckCircle />
          <div><small>Entregues</small><strong>{delivered.length}</strong></div>
        </article>
      </section>

      <section className="standalone-layout">
        <form action={createStandaloneArtwork} className="standalone-form-card">
          <div className="section-heading">
            <div>
              <span className="micro-label">NOVA DEMANDA</span>
              <h2>Criar arte avulsa</h2>
            </div>
            <FiPlus />
          </div>

          <label className="field">
            <span>Cliente</span>
            <select name="clientId" required defaultValue="">
              <option value="" disabled>Selecione</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </label>

          {designer.role === "DESIGNER" ? (
            <input type="hidden" name="designerId" value={designer.id} />
          ) : (
            <label className="field">
              <span>Designer responsável</span>
              <select name="designerId" required defaultValue="">
                <option value="" disabled>Selecione</option>
                {designers
                  .filter((item) => item.role === "DESIGNER" && item.active)
                  .map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
              </select>
            </label>
          )}

          <label className="field">
            <span>Título</span>
            <input name="title" required placeholder="Ex.: Banner campanha de setembro" />
          </label>

          <label className="field">
            <span>Briefing</span>
            <textarea
              name="briefing"
              required
              rows={5}
              placeholder="Objetivo, mensagem, referências e orientações."
            />
          </label>

          <div className="standalone-form-grid">
            <label className="field">
              <span>Tipo</span>
              <select name="contentType" defaultValue="POST">
                <option value="POST">Post</option>
                <option value="CAROUSEL">Carrossel</option>
                <option value="REEL">Reel</option>
                <option value="STORY">Story</option>
              </select>
            </label>

            <label className="field">
              <span>Formato</span>
              <input name="formatLabel" placeholder="1080x1350" />
            </label>

            <label className="field">
              <span>Quantidade</span>
              <input type="number" min="1" max="50" name="quantity" defaultValue="1" required />
            </label>

            <label className="field">
              <span>Pontos</span>
              <input type="number" min="1" max="200" name="effortPoints" defaultValue="1" required />
            </label>

            <label className="field">
              <span>Prioridade</span>
              <select name="priority" defaultValue="NORMAL">
                <option value="LOW">Baixa</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </label>

            <label className="field">
              <span>Prazo</span>
              <input type="datetime-local" name="dueAt" />
            </label>
          </div>

          <label className="field">
            <span>Pasta/arquivo no Nextcloud (opcional)</span>
            <input
              name="nextcloudPath"
              placeholder="Ex.: /Artes avulsas/Setembro/banner-final.psd"
            />
          </label>

          <button className="button button-primary button-wide" type="submit">
            <FiPlus /> Criar demanda
          </button>
        </form>

        <section className="standalone-list-card">
          <div className="section-heading">
            <div>
              <span className="micro-label">FILA</span>
              <h2>Demandas</h2>
            </div>
            <span>{artworks.length} total</span>
          </div>

          {artworks.length === 0 ? (
            <div className="filtered-empty">Nenhuma arte avulsa cadastrada.</div>
          ) : (
            <div className="standalone-list">
              {artworks.map((artwork) => {
                const isOverdue =
                  artwork.dueAt &&
                  !["DELIVERED", "CANCELLED"].includes(artwork.status) &&
                  new Date(artwork.dueAt) < new Date();

                return (
                  <article className="standalone-card" key={artwork.id}>
                    <div className="standalone-card-head">
                      <div>
                        <span className={"standalone-priority priority-" + artwork.priority.toLowerCase()}>
                          {priorityLabels[artwork.priority]}
                        </span>
                        <h3>{artwork.title}</h3>
                        <p>{artwork.client.name} · {artwork.designer.name}</p>
                      </div>
                      <span className={"standalone-status status-" + artwork.status.toLowerCase()}>
                        {statusLabels[artwork.status]}
                      </span>
                    </div>

                    <p className="standalone-briefing">{artwork.briefing}</p>

                    <div className="standalone-meta">
                      <span>{artwork.contentType}</span>
                      <span>{artwork.quantity} peça(s)</span>
                      <span>{artwork.effortPoints} pts</span>
                      <span className={isOverdue ? "is-overdue" : ""}>
                        {dateLabel(artwork.dueAt)}
                      </span>
                      {artwork.revisionCount > 0 ? (
                        <span><FiRefreshCw /> {artwork.revisionCount} ajuste(s)</span>
                      ) : null}
                    </div>

                    {artwork.nextcloudPath ? (
                      <div className="standalone-path">
                        Nextcloud: <code>{artwork.nextcloudPath}</code>
                      </div>
                    ) : null}

                    <StandaloneArtworkStatusForm
                      id={artwork.id}
                      clientId={artwork.clientId}
                      status={artwork.status}
                      currentPath={artwork.nextcloudPath}
                    />
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </AppShell>
  );
}
