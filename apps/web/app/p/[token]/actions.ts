"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CLIENT_SESSION_COOKIE } from "../../../lib/client-auth";
import { getApiUrl } from "../../../lib/api";

export async function submitReview(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const action = String(formData.get("action") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  const reviewerName = String(formData.get("reviewerName") ?? "").trim();

  if (!token || !itemId) {
    throw new Error("Link de aprovação inválido.");
  }

  const cookieStore = await cookies();
  const session = cookieStore.get(CLIENT_SESSION_COOKIE)?.value;

  if (!session) {
    redirect("/cliente/login");
  }

  const response = await fetch(
    `${getApiUrl()}/api/public/calendars/${encodeURIComponent(
      token
    )}/items/${encodeURIComponent(itemId)}/review`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${session}`
      },
      body: JSON.stringify({
        action,
        message: message || undefined,
        reviewerName: reviewerName || undefined
      }),
      cache: "no-store"
    }
  );

  if (response.status === 401) {
    redirect("/cliente/login");
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Não foi possível registrar a avaliação.");
  }

  revalidatePath(`/p/${token}`);
}
