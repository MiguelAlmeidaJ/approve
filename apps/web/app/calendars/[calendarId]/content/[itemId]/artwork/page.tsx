import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { AppShell } from "../../../../../../components/app-shell";
import { ArtworkUploader } from "../../../../../../components/artwork-uploader";
import { requireDesigner } from "../../../../../../lib/auth";
import {
  canAccessClient,
  getCalendar,
  getFormats
} from "../../../../../../lib/api";

export default async function ArtworkPage({
  params
}: {
  params: Promise<{ calendarId: string; itemId: string }>;
}) {
  const { calendarId, itemId } = await params;
  const designer = await requireDesigner();
  const [calendar, formats] = await Promise.all([
    getCalendar(calendarId),
    getFormats()
  ]);

  if (!calendar || !canAccessClient(designer, calendar.client)) {
    notFound();
  }

  if (calendar.stage !== "PRODUCTION" || calendar.archivedAt) {
    redirect(`/calendars/${calendarId}`);
  }

  const item = calendar.contentItems.find((entry) => entry.id === itemId);

  if (
    !item ||
    ![
      "DESIGN_PENDING",
      "DESIGN_IN_PROGRESS",
      "ART_CHANGES_REQUESTED"
    ].includes(item.stage)
  ) {
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
          <span className="micro-label">PRODUÇÃO DA ARTE</span>
          <h1>{item.title}</h1>
          <p>
            O briefing já foi aprovado. Anexe a versão final armazenada no
            Nextcloud.
          </p>
        </div>
      </header>

      <ArtworkUploader
        calendarId={calendar.id}
        clientId={calendar.client.id}
        item={item}
        formats={formats}
      />
    </AppShell>
  );
}
