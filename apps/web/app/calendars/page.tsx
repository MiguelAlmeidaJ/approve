import Link from "next/link";
import { FiUsers } from "react-icons/fi";
import { AppShell } from "../../components/app-shell";
import { CalendarsList } from "../../components/calendars-list";
import { requireDesigner } from "../../lib/auth";
import { getAccessibleClients } from "../../lib/api";

export default async function CalendarsPage() {
  const designer = await requireDesigner();
  const clients = await getAccessibleClients(designer);
  const calendarCount = clients.reduce(
    (total, client) => total + client.calendars.length,
    0
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

      {calendarCount === 0 ? (
        <div className="empty-card">
          <div className="empty-icon">□</div>
          <h3>Nenhum calendário</h3>
          <p>Entre em um cliente e crie o primeiro calendário mensal.</p>
          <Link href="/clients" className="button button-primary">
            <FiUsers aria-hidden="true" />
            Ver clientes
          </Link>
        </div>
      ) : (
        <CalendarsList clients={clients} />
      )}
    </AppShell>
  );
}
