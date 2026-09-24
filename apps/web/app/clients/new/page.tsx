import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import { AppShell } from "../../../components/app-shell";
import { ClientForm } from "../../../components/client-form";
import { createClient } from "../../actions";
import { requireDesigner } from "../../../lib/auth";
import { getDesigners } from "../../../lib/api";

export default async function NewClientPage() {
  const designer = await requireDesigner();
  const designers =
    designer.role === "DESIGNER" ? [] : await getDesigners();

  return (
    <AppShell designer={designer} activeSection="clients">
      <header className="client-editor-header">
        <div>
          <Link href="/clients" className="back-link">
            <FiArrowLeft aria-hidden="true" />
            Clientes
          </Link>
          <span className="micro-label">NOVO CLIENTE</span>
          <h1>Cadastrar cliente</h1>
          <p>
            Cadastre a empresa, o contato e as credenciais que o cliente
            usará para acessar as aprovações.
          </p>
        </div>
      </header>

      <ClientForm
        action={createClient}
        designers={designers}
        currentDesignerName={designer.name}
        cancelHref="/clients"
      />
    </AppShell>
  );
}
