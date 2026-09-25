import Link from "next/link";
import {
  FiAlertTriangle,
  FiBriefcase,
  FiTrendingUp,
  FiUser
} from "react-icons/fi";
import { AppShell } from "../../components/app-shell";
import { requireRole } from "../../lib/auth";
import { getAccessibleClients, getUsers } from "../../lib/api";

export default async function CapacityPage() {
  const manager = await requireRole("ADMIN", "DEV");
  const [clients, users] = await Promise.all([
    getAccessibleClients(manager),
    getUsers()
  ]);
  const designers = users.filter(
    (user) => user.role === "DESIGNER" && user.active
  );

  const rows = designers
    .map((designer) => {
      const ownedClients = clients.filter(
        (client) => client.assignedDesignerId === designer.id
      );
      const productionItems = ownedClients.flatMap((client) =>
        client.calendars.flatMap((calendar) =>
          calendar.contentItems.filter((item) =>
            ["DESIGN_PENDING", "DESIGN_IN_PROGRESS", "ART_CHANGES_REQUESTED"].includes(
              item.stage
            )
          )
        )
      );
      const points = productionItems.reduce(
        (total, item) =>
          total +
          (item.effortPoints || 1) +
          (item.stage === "ART_CHANGES_REQUESTED" ? 1 : 0),
        0
      );
      const capacity = designer.weeklyCapacityPoints ?? 30;
      const percentage = capacity > 0 ? Math.round((points / capacity) * 100) : 0;

      return {
        designer,
        clients: ownedClients.length,
        pieces: productionItems.length,
        changes: productionItems.filter(
          (item) => item.stage === "ART_CHANGES_REQUESTED"
        ).length,
        points,
        capacity,
        percentage
      };
    })
    .sort((a, b) => b.percentage - a.percentage);

  const overloaded = rows.filter((row) => row.percentage > 100).length;
  const available = rows.filter((row) => row.percentage < 70).length;

  return (
    <AppShell designer={manager} activeSection="capacity">
      <header className="page-header">
        <div>
          <span className="micro-label">GESTÃO DE CARGA</span>
          <h1>Capacidade da equipe</h1>
          <p>
            Compare demanda criativa e capacidade semanal antes de redistribuir clientes.
          </p>
        </div>
        <Link href="/equipe" className="button button-ghost">
          Ajustar capacidade
        </Link>
      </header>

      <section className="capacity-summary">
        <article><FiUser /><div><small>Designers ativos</small><strong>{rows.length}</strong></div></article>
        <article><FiAlertTriangle /><div><small>Acima da capacidade</small><strong>{overloaded}</strong></div></article>
        <article><FiTrendingUp /><div><small>Com folga</small><strong>{available}</strong></div></article>
        <article><FiBriefcase /><div><small>Peças na produção</small><strong>{rows.reduce((n, row) => n + row.pieces, 0)}</strong></div></article>
      </section>

      <section className="capacity-list">
        {rows.map((row) => (
          <article className="capacity-row" key={row.designer.id}>
            <div className="capacity-person">
              <span>{row.designer.name.slice(0, 2).toUpperCase()}</span>
              <div>
                <strong>{row.designer.name}</strong>
                <small>{row.clients} cliente(s) atribuídos</small>
              </div>
            </div>

            <div className="capacity-metric">
              <small>Fila atual</small>
              <strong>{row.pieces} peças</strong>
              <span>{row.changes} alteração(ões)</span>
            </div>

            <div className="capacity-meter">
              <div className="capacity-meter-head">
                <span>{row.points} / {row.capacity} pontos</span>
                <strong>{row.percentage}%</strong>
              </div>
              <div className="capacity-meter-track">
                <i
                  className={
                    row.percentage > 100
                      ? "over"
                      : row.percentage >= 80
                        ? "warning"
                        : "ok"
                  }
                  style={{ width: `${Math.min(row.percentage, 100)}%` }}
                />
              </div>
            </div>

            <span
              className={
                row.percentage > 100
                  ? "capacity-status overloaded"
                  : row.percentage >= 80
                    ? "capacity-status busy"
                    : "capacity-status healthy"
              }
            >
              {row.percentage > 100
                ? "Sobrecarregado"
                : row.percentage >= 80
                  ? "Atenção"
                  : "Disponível"}
            </span>

            <Link
              href={`/equipe?edit=${row.designer.id}`}
              className="button button-ghost button-small"
            >
              Ajustar
            </Link>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
