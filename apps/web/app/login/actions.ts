"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "../../lib/auth";
import { getApiUrl } from "../../lib/api";

export async function loginDesigner(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const response = await fetch(`${getApiUrl()}/api/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ email, password }),
    cache: "no-store"
  });

  if (!response.ok) {
    redirect("/login?error=1");
  }

  const payload = (await response.json()) as {
    token: string;
    expiresAt: string;
  };

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
