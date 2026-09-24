import { NextRequest } from "next/server";
import { SESSION_COOKIE } from "../../../../lib/auth";
import { getApiUrl } from "../../../../lib/api";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return new Response("Sessão não encontrada.", { status: 401 });
  }

  const clientId = request.nextUrl.searchParams.get("clientId")?.trim();
  const path = request.nextUrl.searchParams.get("path")?.trim();

  if (!clientId || !path) {
    return new Response("Arquivo não informado.", { status: 400 });
  }

  const endpoint = new URL("/api/admin/nextcloud/file", getApiUrl());
  endpoint.searchParams.set("clientId", clientId);
  endpoint.searchParams.set("path", path);

  const range = request.headers.get("range");
  const response = await fetch(endpoint, {
    headers: {
      "x-admin-key": process.env.API_ADMIN_KEY ?? "",
      authorization: `Bearer ${token}`,
      ...(range ? { range } : {})
    },
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

    if (value) {
      headers.set(name, value);
    }
  }

  return new Response(response.body, {
    status: response.status,
    headers
  });
}
