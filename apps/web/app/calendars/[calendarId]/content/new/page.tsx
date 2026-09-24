import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { AppShell } from "../../../../../components/app-shell";
import { ContentComposer } from "../../../../../components/content-composer";
import { requireDesigner } from "../../../../../lib/auth";
import {
  canAccessClient,
  getCalendar,
  getFormats
} from "../../../../../lib/api";

export default async function NewCalendarContentPage({
  params
}: {
  params: Promise<{ calendarId: string }>;
}) {
  const { calendarId } = await params;
  const designer = await requireDesigner();
  const [calendar, formats] = await Promise.all([
    getCalendar(calendarId),
    getFormats()
  ]);

  if (!calendar || !canAccessClient(designer, calendar.client)) {
    notFound();
  }

  if (calendar.archivedAt) {
    redirect(`/calendars/${calendar.id}`);
  }

  return (
    <AppShell designer={designer} activeSection="calendars">
      <header className="page-header compact-header content-create-header">
        <div>
          <Link href={`/calendars/${calendar.id}`} className="back-link">
            <FiArrowLeft aria-hidden="true" />
            {calendar.title}
          </Link>
          <span className="micro-label">NOVA PEÇA</span>
          <h1>Adicionar conteúdo</h1>
          <p>
            Escolha o tipo de publicação, um dos dias planejados e a arte
            direto do Nextcloud.
          </p>
        </div>
      </header>

      <ContentComposer
        calendarId={calendar.id}
        clientId={calendar.client.id}
        postingDays={calendar.postingDays}
        formats={formats}
        showHeader={false}
      />
    </AppShell>
  );
}
