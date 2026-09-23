"use server";

import { revalidatePath } from "next/cache";
import { getApiUrl } from "../lib/api";

async function adminPost(path: string, body?: unknown) {
  const response = await fetch(`${getApiUrl()}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-admin-key": process.env.API_ADMIN_KEY ?? ""
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Erro ${response.status} ao salvar.`);
  }
}

function required(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`Campo obrigatório: ${key}`);
  }

  return value;
}

export async function createClient(formData: FormData) {
  await adminPost("/api/admin/clients", {
    name: required(formData, "name")
  });

  revalidatePath("/");
}

export async function createCalendar(formData: FormData) {
  await adminPost("/api/admin/calendars", {
    clientId: required(formData, "clientId"),
    title: required(formData, "title"),
    periodStart: new Date(required(formData, "periodStart")).toISOString(),
    periodEnd: new Date(required(formData, "periodEnd")).toISOString()
  });

  revalidatePath("/");
}

export async function createContentItem(formData: FormData) {
  const rawDate = required(formData, "scheduledAt");
  const assetUrl = String(formData.get("assetUrl") ?? "").trim();

  await adminPost("/api/admin/items", {
    calendarId: required(formData, "calendarId"),
    title: required(formData, "title"),
    scheduledAt: new Date(rawDate).toISOString(),
    channel: required(formData, "channel"),
    format: required(formData, "format"),
    caption: required(formData, "caption"),
    assetUrl: assetUrl || undefined
  });

  revalidatePath("/");
}

export async function rotateCalendarToken(calendarId: string) {
  await adminPost(
    `/api/admin/calendars/${encodeURIComponent(calendarId)}/rotate-token`
  );

  revalidatePath("/");
}
