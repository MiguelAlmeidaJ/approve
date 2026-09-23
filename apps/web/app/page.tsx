import { Brand } from "../components/brand";
import { getDashboard } from "../lib/api";
import {
  createCalendar,
  createClient,
  createContentItem,
  rotateCalendarToken
} from "./actions";

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
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo"
  }).format(new Date(value));
}

export default async function DashboardPage() {
  const clients = await getDashboard();
  const calendars = clients.flatMap((client) =>
    client.calendars.map((calendar) => ({
      ...calendar,
      clientName: client.name
    }))
  );
  const items = calendars.flatMap((calendar) => calendar.contentItems);
  const pending = items.filter(
    (item) => item.status === "PENDING_APPROVAL"
  ).length;
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  return (
    <main className="shell">
      <header className="admin-header">
        <Brand />
        <div className="eyebrow">SISTEMA DE APROVAÇÃO</div>
      </header>

      <section className="hero">
        <div>
          <span className="eyebrow eyebrow-light">TERCEIRO ANDAR</span>
          <h1>Conteúdo organizado. Aprovação sem ruído.</h1>
          <p>
            Monte o calendário do cliente, compartilhe um único link e acompanhe
            aprovações ou pedidos de alteração em tempo real.
          </p>
        </div>
        <div className="hero-accent" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>

      <section className="stat-grid" aria-label="Resumo">
        <article className="stat-card">
          <strong>{clients.length}</strong>
          <span>clientes</span>
        </article>
        <article className="stat-card">
          <strong>{calendars.length}</strong>
          <span>calendários</span>
        </article>
        <article className="stat-card stat-card-pink">
          <strong>{pending}</strong>
          <span>aguardando aprovação</span>
        </article>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CADASTRO RÁPIDO</span>
            <h2>Preparar calendário</h2>
          </div>
          <p>
            Cadastre cliente, período e peças. Todo conteúdo novo entra como
            “Aguardando aprovação”.
          </p>
        </div>

        <div className="form-grid">
          <form action={createClient} className="panel form-card">
            <span className="step">01</span>
            <h3>Novo cliente</h3>
            <label>
              Nome
              <input name="name" placeholder="Ex.: Acme Saúde" required />
            </label>
            <button type="submit">Cadastrar cliente</button>
          </form>

          <form action={createCalendar} className="panel form-card">
            <span className="step">02</span>
            <h3>Novo calendário</h3>
            <label>
              Cliente
              <select name="clientId" required defaultValue="">
                <option value="" disabled>
                  Selecione
                </option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Título
              <input
                name="title"
                placeholder="Calendário editorial — Outubro"
                required
              />
            </label>
            <div className="field-row">
              <label>
                Início
                <input name="periodStart" type="date" required />
              </label>
              <label>
                Fim
                <input name="periodEnd" type="date" required />
              </label>
            </div>
            <button type="submit" disabled={clients.length === 0}>
              Criar calendário
            </button>
          </form>

          <form action={createContentItem} className="panel form-card">
            <span className="step">03</span>
            <h3>Novo conteúdo</h3>
            <label>
              Calendário
              <select name="calendarId" required defaultValue="">
                <option value="" disabled>
                  Selecione
                </option>
                {calendars.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.clientName} — {calendar.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Título da peça
              <input name="title" placeholder="Post institucional" required />
            </label>
            <div className="field-row">
              <label>
                Publicação
                <input name="scheduledAt" type="datetime-local" required />
              </label>
              <label>
                Canal
                <select name="channel" defaultValue="INSTAGRAM" required>
                  <option value="INSTAGRAM">Instagram</option>
                  <option value="STORIES">Stories</option>
                  <option value="FACEBOOK">Facebook</option>
                  <option value="LINKEDIN">LinkedIn</option>
                  <option value="TIKTOK">TikTok</option>
                  <option value="OTHER">Outro</option>
                </select>
              </label>
            </div>
            <label>
              Formato
              <input name="format" placeholder="Feed 1080x1350" required />
            </label>
            <label>
              URL da arte
              <input
                name="assetUrl"
                type="url"
                placeholder="https://... (opcional)"
              />
            </label>
            <label>
              Legenda
              <textarea
                name="caption"
                rows={4}
                placeholder="Texto para aprovação..."
                required
              />
            </label>
            <button type="submit" disabled={calendars.length === 0}>
              Adicionar para aprovação
            </button>
          </form>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CALENDÁRIOS</span>
            <h2>Acompanhamento</h2>
          </div>
          <p>
            O link público não exige login. Ao trocar o link, o anterior deixa
            de funcionar imediatamente.
          </p>
        </div>

        <div className="calendar-list">
          {calendars.length === 0 ? (
            <div className="empty-state panel">
              Nenhum calendário criado ainda.
            </div>
          ) : (
            calendars.map((calendar) => {
              const shareUrl = `${appUrl}/p/${calendar.shareToken}`;

              return (
                <article className="panel calendar-card" key={calendar.id}>
                  <div className="calendar-top">
                    <div>
                      <span className="client-chip">{calendar.clientName}</span>
                      <h3>{calendar.title}</h3>
                    </div>
                    <div className="share-actions">
                      <a href={shareUrl} target="_blank" rel="noreferrer">
                        Abrir link do cliente
                      </a>
                      <form action={rotateCalendarToken.bind(null, calendar.id)}>
                        <button className="button-secondary" type="submit">
                          Trocar link
                        </button>
                      </form>
                    </div>
                  </div>

                  <code className="share-url">{shareUrl}</code>

                  <div className="content-table">
                    {calendar.contentItems.length === 0 ? (
                      <p className="muted">Sem peças neste calendário.</p>
                    ) : (
                      calendar.contentItems.map((item) => (
                        <div className="content-row" key={item.id}>
                          <div>
                            <strong>{item.title}</strong>
                            <span>
                              {item.channel} · {item.format} ·{" "}
                              {formatDate(item.scheduledAt)}
                            </span>
                          </div>
                          <span
                            className={`status status-${item.status.toLowerCase()}`}
                          >
                            {statusLabel[item.status]}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
