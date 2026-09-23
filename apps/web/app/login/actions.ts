"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "../../lib/auth";
import { getApiUrl } from "../../lib/api";

type LoginPayload = {
  token: string;
  expiresAt: string;
};

export async function loginDesigner(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const endpoint = `${getApiUrl()}/api/auth/login`;

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json"
      },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
      redirect: "manual"
    });
  } catch (error) {
    console.error("[auth] Não foi possível conectar à API:", endpoint, error);
    redirect("/login?error=api");
  }

  const contentType = response.headers.get("content-type") ?? "";
  const rawBody = await response.text();

  if (!contentType.includes("application/json")) {
    console.error(
      "[auth] A API de login respondeu com conteúdo não JSON.",
      {
        endpoint,
        status: response.status,
        contentType,
        preview: rawBody.slice(0, 160)
      }
    );
    redirect("/login?error=api");
  }

  if (!response.ok) {
    redirect("/login?error=credentials");
  }

  let payload: LoginPayload;

  try {
    payload = JSON.parse(rawBody) as LoginPayload;
  } catch (error) {
    console.error("[auth] JSON inválido recebido da API de login.", error);
    redirect("/login?error=api");
  }

  if (!payload.token || !payload.expiresAt) {
    console.error("[auth] Resposta de login incompleta.", payload);
    redirect("/login?error=api");
  }

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, payload.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(payload.expiresAt)
  });

  redirect("/");
}
