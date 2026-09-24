import Link from "next/link";
import { notFound } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { AppShell } from "../../../../components/app-shell";
import { ClientForm } from "../../../../components/client-form";
import { updateClient } from "../../../actions";
import { requireDesigner } from "../../../../lib/auth";
import {
  canAccessClient,
  getClient,
  getDesigners
} from "../../../../lib/api";

export default async function EditClientPage({
  params
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const designer = await requireDesigner();
  const client = await getClient(clientId);

  if (!client || !canAccessClient(designer, client)) {
    notFound();
  }

  const designers =
    designer.role === "DESIGNER" ? [] : await getDesigners();

  return (
    <AppShell designer={designer} activeSection="clients">
      <header className="client-editor-header">
        <div>
          <Link href={`/clients/${client.id}`} className="back-link">
            <FiArrowLeft aria-hidden="true" />
            {client.name}
          </Link>
          <span className="micro-label">EDITAR CLIENTE</span>
          <h1>Dados do cliente</h1>
          <p>
            Atualize os dados da empresa, contato, acesso e responsável.
          </p>
        </div>
      </header>

      <ClientForm
        action={updateClient}
        designers={designers}
        currentDesignerName={
          client.assignedDesigner?.name ?? designer.name
        }
        client={client}
        cancelHref={`/clients/${client.id}`}
      />
    </AppShell>
  );
}
