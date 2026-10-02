"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "../../lib/auth";
import { CLIENT_SESSION_COOKIE } from "../../lib/client-auth";
import { getApiUrl } from "../../lib/api";

type DesignerLoginPayload = {
  token: string;
  expiresAt: string;
  designer: {
    mustChangePassword: boolean;
  };
};

type ClientLoginPayload = {
  token: string;
  expiresAt: string;
};

async function loginRequest(endpoint: string, email: string, password: string) {
  return fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
    redirect: "manual"
  });
}

export async function loginAccount(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const requestedNext = String(formData.get("next") ?? "").trim();

  let designerResponse: Response;

  try {
    designerResponse = await loginRequest(
      `${getApiUrl()}/api/auth/login`,
      email,
      password
    );
  } catch (error) {
    console.error("[auth] Não foi possível conectar à API.", error);
    redirect("/login?error=api");
  }

  if (designerResponse.ok) {
    const payload = (await designerResponse.json()) as DesignerLoginPayload;

    if (!payload.token || !payload.expiresAt) {
      console.error("[auth] Resposta de login de equipe incompleta.", payload);
      redirect("/login?error=api");
    }

    const cookieStore = await cookies();
    cookieStore.delete(CLIENT_SESSION_COOKIE);
    cookieStore.set(SESSION_COOKIE, payload.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(payload.expiresAt)
    });

    redirect(payload.designer?.mustChangePassword ? "/nova-senha" : "/");
  }

  if (designerResponse.status !== 401) {
    console.error(
      "[auth] Login da equipe respondeu com erro inesperado.",
      designerResponse.status,
      await designerResponse.text()
    );
    redirect("/login?error=api");
  }

  let clientResponse: Response;

  try {
    clientResponse = await loginRequest(
      `${getApiUrl()}/api/client-auth/login`,
      email,
      password
    );
  } catch (error) {
    console.error("[auth] Não foi possível consultar login do cliente.", error);
    redirect("/login?error=api");
  }

  if (!clientResponse.ok) {
    if (clientResponse.status !== 401) {
      console.error(
        "[auth] Login do cliente respondeu com erro inesperado.",
        clientResponse.status,
        await clientResponse.text()
      );
      redirect("/login?error=api");
    }

    redirect("/login?error=credentials");
  }

  const payload = (await clientResponse.json()) as ClientLoginPayload;

  if (!payload.token || !payload.expiresAt) {
    console.error("[auth] Resposta de login do cliente incompleta.", payload);
    redirect("/login?error=api");
  }

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.set(CLIENT_SESSION_COOKIE, payload.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(payload.expiresAt)
  });

  const next =
    requestedNext.startsWith("/p/") || requestedNext.startsWith("/cliente")
      ? requestedNext
      : "/cliente";

  redirect(next);
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
