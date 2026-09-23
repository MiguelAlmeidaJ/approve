import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Designer, getApiUrl } from "./api";

export const SESSION_COOKIE = "ta_designer_session";

export async function getDesigner(): Promise<Designer | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const response = await fetch(`${getApiUrl()}/api/auth/me`, {
    headers: {
      authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<Designer>;
}

export async function requireDesigner() {
  const designer = await getDesigner();

  if (!designer) {
    redirect("/login");
  }

  return designer;
}
