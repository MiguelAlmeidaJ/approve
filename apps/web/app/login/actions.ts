"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "../../lib/auth";
import { getApiUrl } from "../../lib/api";

type LoginPayload = {
  token: string;
  expiresAt: string;
  designer: {
    mustChangePassword: boolean;
  };
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

  redirect(payload.designer?.mustChangePassword ? "/nova-senha" : "/");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirect("/esqueci-senha?error=email");
  }

  let response: Response;

  try {
    response = await fetch(`${getApiUrl()}/api/auth/forgot-password`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json"
      },
      body: JSON.stringify({ email }),
      cache: "no-store"
    });
  } catch (error) {
    console.error("[auth] Falha ao solicitar recuperação de senha.", error);
    redirect("/esqueci-senha?error=api");
  }

  if (!response.ok) {
    console.error(
      "[auth] Falha no envio da recuperação de senha.",
      response.status,
      await response.text()
    );
    redirect("/esqueci-senha?error=mail");
  }

  redirect("/esqueci-senha?sent=1");
}

export async function changeDesignerPassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    redirect("/login");
  }

  let response: Response;

  try {
    response = await fetch(`${getApiUrl()}/api/auth/change-password`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ password, confirmPassword }),
      cache: "no-store"
    });
  } catch (error) {
    console.error("[auth] Falha ao alterar senha.", error);
    redirect("/nova-senha?error=api");
  }

  if (!response.ok) {
    console.error(
      "[auth] A API rejeitou a nova senha.",
      response.status,
      await response.text()
    );
    redirect(
      `/nova-senha?error=${response.status === 400 ? "password" : "api"}`
    );
  }

  redirect("/");
}
