import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "../../../../lib/auth";
import { getApiUrl } from "../../../../lib/api";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { message: "Sessão não encontrada." },
      { status: 401 }
    );
  }

  const clientId = request.nextUrl.searchParams.get("clientId")?.trim();
  const path = request.nextUrl.searchParams.get("path")?.trim() || "/";

  if (!clientId) {
    return NextResponse.json(
      { message: "Cliente não informado." },
      { status: 400 }
    );
  }

  const endpoint = new URL("/api/admin/nextcloud/files", getApiUrl());
  endpoint.searchParams.set("clientId", clientId);
  endpoint.searchParams.set("path", path);

  const response = await fetch(endpoint, {
    headers: {
      "x-admin-key": process.env.API_ADMIN_KEY ?? "",
      authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });

  const text = await response.text();

  return new NextResponse(text, {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get("content-type") ?? "application/json"
    }
  });
}
