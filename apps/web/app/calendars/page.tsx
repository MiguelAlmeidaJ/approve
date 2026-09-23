import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { requireDesigner } from "../../lib/auth";
import { getAccessibleClients } from "../../lib/api";

export default async function CalendarsPage() {
  const designer = await requireDesigner();
  const clients = await getAccessibleClients(designer);
  const calendars = clients.flatMap((client) =>
    client.calendars.map((calendar) => ({
      ...calendar,
      client
    }))
  );

  return (
    <AppShell designer={designer} activeSection="calendars">
      <header className="page-header">
        <div>
          <span className="micro-label">CALENDÁRIO</span>
          <h1>Calendários</h1>
          <p>
            Todos os calendários dos clientes que você pode acessar.
          </p>
        </div>
      </header>

      {calendars.length === 0 ? (
        <div className="empty-card">
          <div className="empty-icon">□</div>
          <h3>Nenhum calendário</h3>
          <p>Entre em um cliente e crie o primeiro calendário mensal.</p>
          <Link href="/clients" className="button button-primary">
            Ver clientes
          </Link>
        </div>
      ) : (
        <div className="calendar-list-simple">
          {calendars.map((calendar) => {
            const approved = calendar.contentItems.filter(
              (item) => item.status === "APPROVED"
            ).length;

            return (
              <Link
                href={`/calendars/${calendar.id}`}
                className="calendar-row"
                key={calendar.id}
              >
                <div className="calendar-month-block">
                  <span>
                    {new Intl.DateTimeFormat("pt-BR", {
                      month: "short",
                      timeZone: "UTC"
                    })
                      .format(new Date(calendar.periodStart))
                      .replace(".", "")
                      .toUpperCase()}
                  </span>
                  <strong>
                    {new Date(calendar.periodStart).getUTCFullYear()}
                  </strong>
                </div>

                <div className="calendar-row-main">
                  <h3>{calendar.title}</h3>
                  <p>
                    {calendar.client.name} · {calendar.contentItems.length} peça(s)
                  </p>
                </div>

                <div className="calendar-progress">
                  <div>
                    <span
                      style={{
                        width:
                          calendar.contentItems.length === 0
                            ? "0%"
                            : `${Math.round(
                                (approved / calendar.contentItems.length) * 100
                              )}%`
                      }}
                    />
                  </div>
                  <small>
                    {approved}/{calendar.contentItems.length}
                  </small>
                </div>

                <span className="arrow-link">→</span>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
