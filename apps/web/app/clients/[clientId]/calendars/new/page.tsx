import { notFound, redirect } from "next/navigation";
import { requireDesigner } from "../../../../../lib/auth";
import { canAccessClient, getClient } from "../../../../../lib/api";

export default async function LegacyNewCalendarPage({
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

  redirect(`/calendars/new?client=${encodeURIComponent(client.id)}`);
}
