import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { requireDesigner } from "../../../lib/auth";
import { getClient, getDashboard } from "../../../lib/api";

function monthName(value: string) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(value));

  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default async function ClientPage({
  params
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const [designer, clients, client] = await Promise.all([
    requireDesigner(),
    getDashboard(),
    getClient(clientId)
  ]);

  if (!client) {
    notFound();
  }

  return (
    <AppShell
      designer={designer}
      clients={clients}
      activeClientId={client.id}
    >
      <header className="page-header">
        <div>
          <span className="micro-label">CLIENTE</span>
          <h1>{client.name}</h1>
          <p>
            Calendários, peças e links de aprovação deste cliente.
          </p>
        </div>
        <Link
          href={`/clients/${client.id}/calendars/new`}
          className="button button-primary"
        >
          + Novo calendário
        </Link>
      </header>

      <section className="section">
        <div className="section-title-row">
          <h2>Calendários</h2>
          <span>{client.calendars.length} no total</span>
        </div>

        {client.calendars.length === 0 ? (
          <div className="empty-card">
            <div className="empty-icon">□</div>
            <h3>Sem calendário ainda</h3>
            <p>Crie o mês e depois adicione as peças para aprovação.</p>
            <Link
              href={`/clients/${client.id}/calendars/new`}
              className="button button-primary"
            >
              Criar calendário
            </Link>
          </div>
        ) : (
          <div className="calendar-list-simple">
            {client.calendars.map((calendar) => {
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
                    <h3>{calendar.title || monthName(calendar.periodStart)}</h3>
                    <p>
                      {calendar.contentItems.length} peça(s) · {approved}{" "}
                      aprovada(s)
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
                      {calendar.contentItems.length === 0
                        ? "vazio"
                        : `${approved}/${calendar.contentItems.length}`}
                    </small>
                  </div>

                  <span className="arrow-link">→</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
