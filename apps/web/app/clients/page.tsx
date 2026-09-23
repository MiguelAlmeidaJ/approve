import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { requireDesigner } from "../../lib/auth";
import { getAccessibleClients } from "../../lib/api";

export default async function ClientsPage() {
  const designer = await requireDesigner();
  const clients = await getAccessibleClients(designer);

  return (
    <AppShell designer={designer} activeSection="clients">
      <header className="page-header">
        <div>
          <span className="micro-label">CLIENTES</span>
          <h1>Clientes</h1>
          <p>
            {designer.role === "DESIGNER"
              ? "Somente os clientes atribuídos a você aparecem aqui."
              : "Gerencie os clientes e seus responsáveis."}
          </p>
        </div>
        <Link href="/clients/new" className="button button-primary">
          + Novo cliente
        </Link>
      </header>

      {clients.length === 0 ? (
        <div className="empty-card">
          <div className="empty-icon">+</div>
          <h3>Nenhum cliente disponível</h3>
          <p>Cadastre ou atribua um cliente para começar.</p>
          <Link href="/clients/new" className="button button-primary">
            Cadastrar cliente
          </Link>
        </div>
      ) : (
        <div className="client-card-grid">
          {clients.map((client) => (
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
                  {client.calendars.length} calendário(s) ·{" "}
                  {client.assignedDesigner?.name ?? "sem responsável"}
                </p>
              </div>

              <span className="latest-calendar">
                {client.assignedDesigner
                  ? client.assignedDesigner.email
                  : "Atribua um designer responsável"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
