import Link from "next/link";
import {
  FiBriefcase,
  FiPlus,
  FiUsers
} from "react-icons/fi";
import { AppShell } from "../../components/app-shell";
import { ClientsList } from "../../components/clients-list";
import { requireDesigner } from "../../lib/auth";
import { getAccessibleClients } from "../../lib/api";

export default async function ClientsPage() {
  const designer = await requireDesigner();
  const clients = await getAccessibleClients(designer);
  const withDesigner = clients.filter(
    (client) => client.assignedDesignerId
  ).length;
  const niches = new Set(
    clients.map((client) => client.niche).filter(Boolean)
  ).size;

  return (
    <AppShell designer={designer} activeSection="clients">
      <header className="clients-page-header">
        <div>
          <span className="micro-label">CLIENTES</span>
          <h1>Clientes</h1>
          <p>
            {designer.role === "DESIGNER"
              ? "Sua carteira de clientes, contatos e calendários em um só lugar."
              : "Gerencie a carteira, os responsáveis e os acessos dos clientes."}
          </p>
        </div>
        <Link href="/clients/new" className="button button-primary">
          <FiPlus aria-hidden="true" />
          Novo cliente
        </Link>
      </header>

      {clients.length > 0 ? (
        <section className="client-overview-strip">
          <article>
            <FiUsers aria-hidden="true" />
            <span>
              Clientes
              <strong>{clients.length}</strong>
            </span>
          </article>
          <article>
            <FiBriefcase aria-hidden="true" />
            <span>
              Nichos
              <strong>{niches}</strong>
            </span>
          </article>
          <article>
            <span className="client-overview-dot" />
            <span>
              Com responsável
              <strong>{withDesigner}</strong>
            </span>
          </article>
        </section>
      ) : null}

      {clients.length === 0 ? (
        <div className="empty-card">
          <div className="empty-icon">+</div>
          <h3>Nenhum cliente disponível</h3>
          <p>Cadastre ou atribua um cliente para começar.</p>
          <Link href="/clients/new" className="button button-primary">
            <FiPlus aria-hidden="true" />
            Cadastrar cliente
          </Link>
        </div>
      ) : (
        <ClientsList clients={clients} />
      )}
    </AppShell>
  );
}
