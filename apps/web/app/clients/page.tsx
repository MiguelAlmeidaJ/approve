import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import { AppShell } from "../../components/app-shell";
import { ClientsList } from "../../components/clients-list";
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
          <FiPlus aria-hidden="true" />
          Novo cliente
        </Link>
      </header>

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
