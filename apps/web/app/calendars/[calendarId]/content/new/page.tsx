import { redirect } from "next/navigation";
import { requireDesigner } from "../../../../../lib/auth";
import { getCalendar } from "../../../../../lib/api";

export default async function LegacyNewContentPage({
  params
}: {
  params: Promise<{ calendarId: string }>;
}) {
  const { calendarId } = await params;
  const designer = await requireDesigner();
  const calendar = await getCalendar(calendarId);

  if (
    calendar &&
    (designer.role === "ADMIN" || designer.role === "DEV") &&
    calendar.stage === "PLANNING"
  ) {
    redirect(`/calendars/${calendarId}/planning/new`);
  }

  redirect(`/calendars/${calendarId}`);
}
