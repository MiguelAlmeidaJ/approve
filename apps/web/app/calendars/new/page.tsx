import Link from "next/link";
import { FiUsers } from "react-icons/fi";
import { AppShell } from "../../../components/app-shell";
import { NewCalendarForm } from "../../../components/new-calendar-form";
import { requireDesigner } from "../../../lib/auth";
import { getAccessibleClients } from "../../../lib/api";

function currentMonthInSaoPaulo() {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    timeZone: "America/Sao_Paulo"
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  return `${year}-${month}`;
}

export default async function NewCalendarPage({
  searchParams
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const designer = await requireDesigner();
  const clients = await getAccessibleClients(designer);
  const { client: initialClientId } = await searchParams;

  return (
    <AppShell designer={designer} activeSection="calendars">
      <header className="page-header compact-header calendar-create-header">
        <div>
          <Link href="/calendars" className="back-link">
            ← Calendários
          </Link>
          <span className="micro-label">NOVO PLANEJAMENTO</span>
          <h1>Crie a agenda do mês</h1>
          <p>
            Escolha o cliente, defina os dias de postagem e comece o mês com o
            ritmo editorial organizado.
          </p>
        </div>
      </header>

      {clients.length === 0 ? (
        <div className="empty-card">
          <div className="empty-icon">
            <FiUsers aria-hidden="true" />
          </div>
          <h3>Nenhum cliente disponível</h3>
          <p>Cadastre ou solicite a atribuição de um cliente antes de continuar.</p>
          <Link href="/clients/new" className="button button-primary">
            Cadastrar cliente
          </Link>
        </div>
      ) : (
        <NewCalendarForm
          clients={clients.map((client) => ({
            id: client.id,
            name: client.name,
            designerName: client.assignedDesigner?.name ?? "Sem responsável"
          }))}
          initialClientId={initialClientId}
          cancelHref="/calendars"
          initialMonth={currentMonthInSaoPaulo()}
        />
      )}
    </AppShell>
  );
}
