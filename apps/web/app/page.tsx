import Link from "next/link";
import { AppShell } from "../components/app-shell";
import { requireDesigner } from "../lib/auth";
import { getAccessibleClients } from "../lib/api";

function calendarLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(value));
}

export default async function DashboardPage() {
  const designer = await requireDesigner();
  const clients = await getAccessibleClients(designer);
  const calendars = clients.flatMap((client) => client.calendars);
  const pieces = calendars.flatMap((calendar) => calendar.contentItems);
  const waiting = pieces.filter(
    (item) => item.status === "PENDING_APPROVAL"
  ).length;

  return (
    <AppShell designer={designer} activeSection="panel">
      <header className="page-header">
        <div>
          <span className="micro-label">PAINEL</span>
          <h1>
            {designer.role === "DESIGNER"
              ? "Seus clientes"
              : "Visão geral"}
          </h1>
          <p>
            {designer.role === "DESIGNER"
              ? "Aqui estão os clientes sob sua responsabilidade e os calendários que você acompanha."
              : "Acompanhe clientes, calendários e aprovações da operação."}
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
          <Link href="/clients">Ver todos →</Link>
        </div>

        {clients.length === 0 ? (
          <div className="empty-card">
            <div className="empty-icon">+</div>
            <h3>Nenhum cliente disponível</h3>
            <p>
              {designer.role === "DESIGNER"
                ? "Peça a um administrador para atribuir um cliente a você ou cadastre um novo cliente."
                : "Cadastre o primeiro cliente para iniciar a operação."}
            </p>
            <Link href="/clients/new" className="button button-primary">
              Cadastrar cliente
            </Link>
          </div>
        ) : (
          <div className="client-card-grid">
            {clients.slice(0, 6).map((client) => {
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
                      {client.assignedDesigner
                        ? `Responsável: ${client.assignedDesigner.name}`
                        : "Sem designer responsável"}
                    </p>
                  </div>
                  <span className="latest-calendar">
                    {latest
                      ? `Último: ${calendarLabel(latest.periodStart)}`
                      : "Nenhum calendário criado"}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
