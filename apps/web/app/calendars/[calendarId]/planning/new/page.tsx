import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { AppShell } from "../../../../../components/app-shell";
import { PlanningItemForm } from "../../../../../components/planning-item-form";
import { requireRole } from "../../../../../lib/auth";
import { getCalendar } from "../../../../../lib/api";

function saoPauloDateKey(value: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(value));

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

export default async function NewPlanningItemPage({
  params
}: {
  params: Promise<{ calendarId: string }>;
}) {
  const { calendarId } = await params;
  const designer = await requireRole("ADMIN", "DEV");
  const calendar = await getCalendar(calendarId);

  if (!calendar) {
    notFound();
  }

  if (calendar.stage !== "PLANNING" || calendar.archivedAt) {
    redirect(`/calendars/${calendarId}`);
  }

  return (
    <AppShell designer={designer} activeSection="calendars">
      <header className="page-header compact-header workflow-page-header">
        <div>
          <Link href={`/calendars/${calendar.id}`} className="back-link">
            <FiArrowLeft aria-hidden="true" />
            {calendar.title}
          </Link>
          <span className="micro-label">PRÉ-CALENDÁRIO</span>
          <h1>Nova publicação</h1>
          <p>
            Cadastre o briefing que será apresentado ao cliente antes da
            produção da arte.
          </p>
        </div>
      </header>

      <PlanningItemForm
        calendarId={calendar.id}
        postingDays={calendar.postingDays}
        occupiedDates={calendar.contentItems.map((item) =>
          saoPauloDateKey(item.scheduledAt)
        )}
      />
    </AppShell>
  );
}
