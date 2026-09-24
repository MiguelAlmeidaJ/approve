import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ClientPortal } from "./api";
import { getApiUrl } from "./api";

export const CLIENT_SESSION_COOKIE = "ta_client_session";

export async function getClientAccount(): Promise<ClientPortal | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CLIENT_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${getApiUrl()}/api/client-auth/me`, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as ClientPortal;
  } catch {
    return null;
  }
}

export async function requireClientAccount() {
  const client = await getClientAccount();

  if (!client) {
    redirect("/cliente/login");
  }

  return client;
}
