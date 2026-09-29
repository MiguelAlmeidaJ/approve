import {
  FiAward,
  FiCalendar,
  FiImage,
  FiRefreshCw,
  FiTrendingUp
} from "react-icons/fi";
import { AppShell } from "../../components/app-shell";
import { requireDesigner } from "../../lib/auth";
import { getProductivity } from "../../lib/api";

export default async function ProductivityPage() {
  const designer = await requireDesigner();
  const rows = await getProductivity();

  const totals = rows.reduce(
    (acc, row) => ({
      pieces: acc.pieces + row.totalPieces,
      points: acc.points + row.totalPoints,
      calendar: acc.calendar + row.calendarPieces,
      standalone: acc.standalone + row.standalonePieces,
      revisions: acc.revisions + row.revisions
    }),
    { pieces: 0, points: 0, calendar: 0, standalone: 0, revisions: 0 }
  );

  return (
    <AppShell designer={designer} activeSection="productivity">
      <header className="page-header">
        <div>
          <span className="micro-label">RESULTADOS</span>
          <h1>Produtividade</h1>
          <p>
            Produção do mês contabilizada automaticamente a partir das artes
            aprovadas nos calendários e das artes avulsas entregues.
          </p>
        </div>
      </header>

      <section className="productivity-kpis">
        <article><FiImage /><div><small>Peças produzidas</small><strong>{totals.pieces}</strong></div></article>
        <article><FiAward /><div><small>Pontos produzidos</small><strong>{totals.points}</strong></div></article>
        <article><FiCalendar /><div><small>Via calendário</small><strong>{totals.calendar}</strong></div></article>
        <article><FiTrendingUp /><div><small>Artes avulsas</small><strong>{totals.standalone}</strong></div></article>
        <article><FiRefreshCw /><div><small>Rodadas de ajuste</small><strong>{totals.revisions}</strong></div></article>
      </section>

      <section className="productivity-table-card">
        <div className="section-heading">
          <div>
            <span className="micro-label">MÊS ATUAL</span>
            <h2>Produção por designer</h2>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="filtered-empty">Nenhum designer com dados no período.</div>
        ) : (
          <div className="productivity-table">
            <div className="productivity-row productivity-head">
              <span>Designer</span>
              <span>Peças</span>
              <span>Calendário</span>
              <span>Avulsas</span>
              <span>Pontos</span>
              <span>Capacidade/sem.</span>
              <span>Ajustes</span>
            </div>
            {rows.map((row) => (
              <div className="productivity-row" key={row.designer.id}>
                <span><strong>{row.designer.name}</strong></span>
                <span>{row.totalPieces}</span>
                <span>{row.calendarPieces}</span>
                <span>{row.standalonePieces}</span>
                <span><strong>{row.totalPoints}</strong></span>
                <span>{row.designer.weeklyCapacityPoints} pts</span>
                <span>{row.revisions}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
