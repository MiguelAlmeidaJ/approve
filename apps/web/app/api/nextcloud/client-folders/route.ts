import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "../../../../lib/auth";
import { getApiUrl } from "../../../../lib/api";

function authHeaders(token: string) {
  return {
    "content-type": "application/json",
    "x-admin-key": process.env.API_ADMIN_KEY ?? "",
    authorization: `Bearer ${token}`
  };
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { message: "Sessão não encontrada." },
      { status: 401 }
    );
  }

  const path = request.nextUrl.searchParams.get("path")?.trim() || "/";
  const endpoint = new URL(
    "/api/admin/nextcloud/client-folders",
    getApiUrl()
  );
  endpoint.searchParams.set("path", path);

  const response = await fetch(endpoint, {
    headers: authHeaders(token),
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

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { message: "Sessão não encontrada." },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const path = String(body?.path ?? "/").trim() || "/";
  const name = String(body?.name ?? "").trim();

  if (!name) {
    return NextResponse.json(
      { message: "Informe o nome da pasta." },
      { status: 400 }
    );
  }

  const response = await fetch(
    new URL("/api/admin/nextcloud/client-folders", getApiUrl()),
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ path, name }),
      cache: "no-store"
    }
  );
  const text = await response.text();

  return new NextResponse(text, {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get("content-type") ?? "application/json"
    }
  });
}
