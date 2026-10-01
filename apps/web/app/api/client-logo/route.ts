import { NextRequest } from "next/server";
import { getApiUrl } from "../../../lib/api";

export async function GET(request: NextRequest) {
  const shareToken = request.nextUrl.searchParams.get("share")?.trim();

  if (!shareToken) {
    return new Response("Link pÃºblico nÃ£o informado.", { status: 400 });
  }

  const endpoint = new URL(
    `/api/public/calendars/${encodeURIComponent(shareToken)}/client-logo`,
    getApiUrl()
  );
  const range = request.headers.get("range");
  const response = await fetch(endpoint, {
    headers: range ? { range } : undefined,
    cache: "no-store"
  });
  const headers = new Headers();

  for (const name of [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "etag",
    "last-modified"
  ]) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }

  headers.set("cache-control", "private, no-store");

  return new Response(response.body, {
    status: response.status,
    headers
  });
}
