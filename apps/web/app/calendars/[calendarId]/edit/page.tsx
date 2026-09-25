import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { AppShell } from "../../../../components/app-shell";
import { NewCalendarForm } from "../../../../components/new-calendar-form";
import { requireDesigner } from "../../../../lib/auth";
import {
  canAccessClient,
  getCalendar,
  getCommemorativeDates
} from "../../../../lib/api";

export default async function EditCalendarPage({
  params
}: {
  params: Promise<{ calendarId: string }>;
}) {
  const { calendarId } = await params;
  const designer = await requireDesigner();
  const [calendar, commemorativeDates] = await Promise.all([
    getCalendar(calendarId),
    getCommemorativeDates()
  ]);

  if (!calendar || !canAccessClient(designer, calendar.client)) {
    notFound();
  }

  if (calendar.archivedAt) {
    redirect(`/calendars/${calendar.id}`);
  }

  const initialMonth = calendar.periodStart.slice(0, 7);

  return (
    <AppShell designer={designer} activeSection="calendars">
      <header className="page-header compact-header calendar-create-header">
        <div>
          <Link href={`/calendars/${calendar.id}`} className="back-link">
            <FiArrowLeft aria-hidden="true" />
            {calendar.title}
          </Link>
          <span className="micro-label">EDITAR CALENDÁRIO</span>
          <h1>Ajuste o planejamento</h1>
          <p>
            Altere o título, mês ou dias de publicação. Dias que já possuem
            peças não podem ser removidos até que o conteúdo seja ajustado.
          </p>
        </div>
      </header>

      <NewCalendarForm
        clients={[
          {
            id: calendar.client.id,
            name: calendar.client.name,
            designerName:
              calendar.client.assignedDesigner?.name ?? "Sem responsável",
            postingWeekdays: calendar.client.postingWeekdays.map(
              (item) => item.weekday
            )
          }
        ]}
        commemorativeDates={commemorativeDates}
        initialClientId={calendar.client.id}
        cancelHref={`/calendars/${calendar.id}`}
        initialMonth={initialMonth}
        calendarId={calendar.id}
        initialTitle={calendar.title}
        initialPostingDays={calendar.postingDays.map((day) =>
          day.scheduledDate.slice(0, 10)
        )}
      />
    </AppShell>
  );
}
