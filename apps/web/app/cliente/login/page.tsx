import { redirect } from "next/navigation";

export default async function ClientLoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target =
    next && (next.startsWith("/cliente") || next.startsWith("/p/"))
      ? next
      : "/cliente";

  redirect(`/login?next=${encodeURIComponent(target)}`);
}
