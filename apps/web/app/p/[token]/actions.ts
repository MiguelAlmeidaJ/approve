"use server";

import { revalidatePath } from "next/cache";
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

  const response = await fetch(
    `${getApiUrl()}/api/public/calendars/${encodeURIComponent(
      token
    )}/items/${encodeURIComponent(itemId)}/review`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        action,
        message: message || undefined,
        reviewerName: reviewerName || undefined
      }),
      cache: "no-store"
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Não foi possível registrar a avaliação.");
  }

  revalidatePath(`/p/${token}`);
}


export async function submitArtworkAnnotation(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const assetId = String(formData.get("assetId") ?? "").trim();
  const authorName = String(formData.get("authorName") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const x = Number(String(formData.get("x") ?? ""));
  const y = Number(String(formData.get("y") ?? ""));

  if (
    !token ||
    !itemId ||
    !message ||
    !Number.isFinite(x) ||
    !Number.isFinite(y)
  ) {
    throw new Error("Marcação inválida.");
  }

  const response = await fetch(
    `${getApiUrl()}/api/public/calendars/${encodeURIComponent(
      token
    )}/items/${encodeURIComponent(itemId)}/annotations`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        assetId: assetId || undefined,
        authorName: authorName || undefined,
        message,
        x: Math.round(x),
        y: Math.round(y)
      }),
      cache: "no-store"
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Não foi possível salvar a marcação.");
  }

  revalidatePath(`/p/${token}`);
}
