import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Designer, getApiUrl, UserRole } from "./api";

export const SESSION_COOKIE = "ta_designer_session";

export async function getDesigner(): Promise<Designer | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  let response: Response;

  try {
    response = await fetch(`${getApiUrl()}/api/auth/me`, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json"
      },
      cache: "no-store",
      redirect: "manual"
    });
  } catch (error) {
    console.error("[auth] Falha ao validar sessão na API.", error);
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return (await response.json()) as Designer;
  } catch (error) {
    console.error("[auth] Resposta inválida ao validar sessão.", error);
    return null;
  }
}

export async function requireDesigner() {
  const designer = await getDesigner();

  if (!designer) {
    redirect("/login");
  }

  return designer;
}

export async function requireRole(...roles: UserRole[]) {
  const designer = await requireDesigner();

  if (!roles.includes(designer.role)) {
    redirect("/");
  }

  return designer;
}
