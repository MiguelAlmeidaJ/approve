import Link from "next/link";
import { AppShell } from "../components/app-shell";
import { requireDesigner } from "../lib/auth";
import { getDashboard } from "../lib/api";

function calendarLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(value));
}

export default async function DashboardPage() {
  const designer = await requireDesigner();
  const clients = await getDashboard();
  const calendars = clients.flatMap((client) => client.calendars);
  const pieces = calendars.flatMap((calendar) => calendar.contentItems);
  const waiting = pieces.filter(
    (item) => item.status === "PENDING_APPROVAL"
  ).length;

  return (
    <AppShell designer={designer} clients={clients}>
      <header className="page-header">
        <div>
          <span className="micro-label">PAINEL</span>
          <h1>Seus clientes</h1>
          <p>
            Escolha um cliente para organizar o calendário e preparar a
            aprovação.
          </p>
        </div>
        <Link href="/clients/new" className="button button-primary">
          + Novo cliente
        </Link>
      </header>

      <section className="overview-strip">
        <div>
          <span>Clientes</span>
          <strong>{clients.length}</strong>
        </div>
        <div>
          <span>Calendários</span>
          <strong>{calendars.length}</strong>
        </div>
        <div>
          <span>Aguardando aprovação</span>
          <strong>{waiting}</strong>
        </div>
      </section>

      <section className="section">
        <div className="section-title-row">
          <h2>Clientes</h2>
          <span>{clients.length} no total</span>
        </div>

        {clients.length === 0 ? (
          <div className="empty-card">
            <div className="empty-icon">+</div>
            <h3>Cadastre o primeiro cliente</h3>
            <p>
              Depois disso você poderá criar o primeiro calendário mensal.
            </p>
            <Link href="/clients/new" className="button button-primary">
              Cadastrar cliente
            </Link>
          </div>
        ) : (
          <div className="client-card-grid">
            {clients.map((client) => {
              const latest = client.calendars[0];

              return (
                <Link
                  href={`/clients/${client.id}`}
                  className="client-card"
                  key={client.id}
                >
                  <div className="client-card-top">
                    <div className="client-card-avatar">
                      {client.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="arrow-link">↗</span>
                  </div>
                  <div>
                    <h3>{client.name}</h3>
                    <p>
                      {client.calendars.length === 0
                        ? "Nenhum calendário criado"
                        : `${client.calendars.length} calendário(s)`}
                    </p>
                  </div>
                  {latest ? (
                    <span className="latest-calendar">
                      Último: {calendarLabel(latest.periodStart)}
                    </span>
                  ) : (
                    <span className="latest-calendar">
                      Criar primeiro calendário
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
