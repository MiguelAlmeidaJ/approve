import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "../../../../lib/auth";
import { getApiUrl } from "../../../../lib/api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { message: "Sessão não encontrada." },
      { status: 401 }
    );
  }

  const incoming = await request.formData();
  const clientId = String(incoming.get("clientId") ?? "").trim();
  const path = String(incoming.get("path") ?? "/").trim() || "/";
  const file = incoming.get("file");

  if (!clientId || !(file instanceof File)) {
    return NextResponse.json(
      { message: "Cliente e arquivo são obrigatórios." },
      { status: 400 }
    );
  }

  const body = new FormData();
  body.set("clientId", clientId);
  body.set("path", path);
  body.set("file", file, file.name);

  const response = await fetch(
    new URL("/api/admin/nextcloud/upload", getApiUrl()),
    {
      method: "POST",
      headers: {
        "x-admin-key": process.env.API_ADMIN_KEY ?? "",
        authorization: `Bearer ${token}`
      },
      body,
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
