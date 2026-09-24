"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CLIENT_SESSION_COOKIE } from "../../lib/client-auth";
import { getApiUrl } from "../../lib/api";

export async function logoutClient() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CLIENT_SESSION_COOKIE)?.value;

  if (token) {
    await fetch(`${getApiUrl()}/api/client-auth/logout`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`
      },
      cache: "no-store"
    }).catch(() => undefined);
  }

  cookieStore.delete(CLIENT_SESSION_COOKIE);
  redirect("/cliente/login");
}
