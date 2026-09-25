import {
  FiBarChart2,
  FiEye,
  FiHeart,
  FiMessageCircle,
  FiSend,
  FiShare2
} from "react-icons/fi";
import { AppShell } from "../../components/app-shell";
import { requireDesigner } from "../../lib/auth";
import { getAccessibleClients } from "../../lib/api";

function number(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export default async function ReportsPage() {
  const designer = await requireDesigner();
  const clients = await getAccessibleClients(designer);
  const published = clients.flatMap((client) =>
    client.calendars.flatMap((calendar) =>
      calendar.contentItems
        .filter((item) => item.stage === "PUBLISHED")
        .map((item) => ({ client, calendar, item }))
    )
  );

  const totals = published.reduce(
    (acc, { item }) => ({
      reach: acc.reach + (item.metricReach ?? 0),
      impressions: acc.impressions + (item.metricImpressions ?? 0),
      likes: acc.likes + (item.metricLikes ?? 0),
      comments: acc.comments + (item.metricComments ?? 0),
      shares: acc.shares + (item.metricShares ?? 0),
      saves: acc.saves + (item.metricSaves ?? 0)
    }),
    { reach: 0, impressions: 0, likes: 0, comments: 0, shares: 0, saves: 0 }
  );

  return (
    <AppShell designer={designer} activeSection="reports">
      <header className="page-header">
        <div>
          <span className="micro-label">PÓS-PUBLICAÇÃO</span>
          <h1>Relatórios</h1>
          <p>
            Acompanhe métricas registradas nas publicações. Quando a integração
            social estiver conectada, esta base poderá ser sincronizada automaticamente.
          </p>
        </div>
      </header>

      <section className="report-kpis">
        <article><FiEye /><div><small>Alcance</small><strong>{number(totals.reach)}</strong></div></article>
        <article><FiBarChart2 /><div><small>Impressões</small><strong>{number(totals.impressions)}</strong></div></article>
        <article><FiHeart /><div><small>Curtidas</small><strong>{number(totals.likes)}</strong></div></article>
        <article><FiMessageCircle /><div><small>Comentários</small><strong>{number(totals.comments)}</strong></div></article>
        <article><FiShare2 /><div><small>Compartilhamentos</small><strong>{number(totals.shares)}</strong></div></article>
        <article><FiSend /><div><small>Salvamentos</small><strong>{number(totals.saves)}</strong></div></article>
      </section>

      <section className="report-table-card">
        <div className="report-table-head">
          <strong>Conteúdos publicados</strong>
          <span>{published.length} publicação(ões)</span>
        </div>
        {published.length === 0 ? (
          <div className="filtered-empty">
            Nenhum conteúdo publicado com métricas registradas.
          </div>
        ) : (
          <div className="report-table">
            {published.map(({ client, calendar, item }) => (
              <a
                href={`/calendars/${calendar.id}/content/${item.id}`}
                className="report-row"
                key={item.id}
              >
                <div>
                  <strong>{item.title}</strong>
                  <small>{client.name} · {calendar.title}</small>
                </div>
                <span><small>Alcance</small><strong>{number(item.metricReach ?? 0)}</strong></span>
                <span><small>Curtidas</small><strong>{number(item.metricLikes ?? 0)}</strong></span>
                <span><small>Comentários</small><strong>{number(item.metricComments ?? 0)}</strong></span>
                <span><small>Compart.</small><strong>{number(item.metricShares ?? 0)}</strong></span>
              </a>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
