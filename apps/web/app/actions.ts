"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireDesigner, requireRole, SESSION_COOKIE } from "../lib/auth";
import { canAccessClient, getApiUrl, getCalendar, getClient } from "../lib/api";

async function internalHeaders() {
  await requireDesigner();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    throw new Error("Sessão não encontrada.");
  }

  return {
    "content-type": "application/json",
    "x-admin-key": process.env.API_ADMIN_KEY ?? "",
    authorization: `Bearer ${token}`,
  };
}

async function adminPost<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${getApiUrl()}${path}`, {
    method: "POST",
    headers: await internalHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Erro ${response.status} ao salvar.`);
  }

  return response.json() as Promise<T>;
}

async function adminPatch<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${getApiUrl()}${path}`, {
    method: "PATCH",
    headers: await internalHeaders(),
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Erro ${response.status} ao salvar.`);
  }

  return response.json() as Promise<T>;
}

function required(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    throw new Error(`Campo obrigatório: ${key}`);
  }

  return value;
}

function brazilLocalDateTimeToIso(value: string) {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return new Date(`${value}:00-03:00`).toISOString();
  }

  return new Date(value).toISOString();
}

function monthRange(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);

  if (!match) {
    throw new Error("Mês de referência inválido.");
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

  return { start, end };
}

function defaultCalendarTitle(date: Date) {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function parsePostingDays(formData: FormData, month: string) {
  const rawPostingDays = required(formData, "postingDays");
  let postingDayValues: unknown;

  try {
    postingDayValues = JSON.parse(rawPostingDays);
  } catch {
    throw new Error("Os dias de postagem informados são inválidos.");
  }

  if (
    !Array.isArray(postingDayValues) ||
    postingDayValues.length === 0 ||
    postingDayValues.some(
      (value) =>
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !value.startsWith(`${month}-`),
    )
  ) {
    throw new Error("Selecione ao menos um dia de postagem para este mês.");
  }

  return [...new Set(postingDayValues)].map((value) =>
    new Date(`${value}T12:00:00.000Z`).toISOString(),
  );
}

export async function createDesigner(formData: FormData) {
  await requireRole("ADMIN");

  await adminPost("/api/admin/designers", {
    name: required(formData, "name"),
    email: required(formData, "email"),
    password: required(formData, "password"),
  });

  revalidatePath("/designers");
}

export async function createUser(formData: FormData) {
  await requireRole("ADMIN");

  await adminPost("/api/admin/users", {
    name: required(formData, "name"),
    email: required(formData, "email"),
    password: required(formData, "password"),
    role: required(formData, "role"),
  });

  revalidatePath("/equipe");
}

export async function updateUser(formData: FormData) {
  await requireRole("ADMIN");
  const userId = required(formData, "userId");
  const password = String(formData.get("password") ?? "").trim();

  await adminPatch(`/api/admin/users/${encodeURIComponent(userId)}`, {
    name: required(formData, "name"),
    email: required(formData, "email"),
    role: required(formData, "role"),
    ...(password ? { password } : {}),
  });

  revalidatePath("/equipe");
  revalidatePath("/");
  redirect("/equipe");
}

export async function createClient(formData: FormData) {
  const designer = await requireDesigner();
  const selectedDesignerId = String(
    formData.get("assignedDesignerId") ?? "",
  ).trim();

  const client = await adminPost<{ id: string }>("/api/admin/clients", {
    name: required(formData, "name"),
    niche: required(formData, "niche"),
    phone: required(formData, "phone"),
    email: required(formData, "email"),
    password: required(formData, "password"),
    nextcloudPath:
      String(formData.get("nextcloudPath") ?? "").trim() || undefined,
    assignedDesignerId:
      designer.role === "DESIGNER"
        ? designer.id
        : selectedDesignerId || undefined,
  });

  revalidatePath("/");
  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}


export async function updateClient(formData: FormData) {
  const designer = await requireDesigner();
  const clientId = required(formData, "clientId");
  const client = await getClient(clientId);

  if (!client || !canAccessClient(designer, client)) {
    throw new Error("Você não tem acesso a este cliente.");
  }

  const password = String(formData.get("password") ?? "").trim();

  await adminPatch(`/api/admin/clients/${encodeURIComponent(clientId)}`, {
    name: required(formData, "name"),
    niche: required(formData, "niche"),
    phone: required(formData, "phone"),
    email: required(formData, "email"),
    nextcloudPath: String(formData.get("nextcloudPath") ?? "").trim(),
    ...(password ? { password } : {}),
  });

  if (designer.role !== "DESIGNER") {
    const assignedDesignerId = String(
      formData.get("assignedDesignerId") ?? "",
    ).trim();

    await adminPost(
      `/api/admin/clients/${encodeURIComponent(clientId)}/assign`,
      {
        designerId: assignedDesignerId || null,
      },
    );
  }

  revalidatePath("/");
  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}`);
}

export async function assignClient(formData: FormData) {
  await requireRole("ADMIN", "DEV");
  const clientId = required(formData, "clientId");
  const designerId = String(formData.get("designerId") ?? "").trim();

  await adminPost(`/api/admin/clients/${encodeURIComponent(clientId)}/assign`, {
    designerId: designerId || null,
  });

  revalidatePath("/");
  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
}

export async function createCalendar(formData: FormData) {
  const designer = await requireDesigner();
  const clientId = required(formData, "clientId");
  const client = await getClient(clientId);

  if (!client || !canAccessClient(designer, client)) {
    throw new Error("Você não tem acesso a este cliente.");
  }

  const month = required(formData, "month");
  const { start, end } = monthRange(month);
  const typedTitle = String(formData.get("title") ?? "").trim();
  const postingDays = parsePostingDays(formData, month);

  const calendar = await adminPost<{ id: string }>("/api/admin/calendars", {
    clientId,
    title: typedTitle || defaultCalendarTitle(start),
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    postingDays,
  });

  revalidatePath("/");
  revalidatePath("/calendars");
  revalidatePath(`/clients/${clientId}`);
  redirect(`/calendars/${calendar.id}`);
}

export async function updateCalendar(formData: FormData) {
  const designer = await requireDesigner();
  const calendarId = required(formData, "calendarId");
  const calendar = await getCalendar(calendarId);

  if (!calendar || !canAccessClient(designer, calendar.client)) {
    throw new Error("Você não tem acesso a este calendário.");
  }

  const month = required(formData, "month");
  const { start, end } = monthRange(month);
  const typedTitle = String(formData.get("title") ?? "").trim();
  const postingDays = parsePostingDays(formData, month);

  await adminPatch(
    `/api/admin/calendars/${encodeURIComponent(calendarId)}`,
    {
      title: typedTitle || defaultCalendarTitle(start),
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      postingDays,
    },
  );

  revalidatePath("/");
  revalidatePath("/calendars");
  revalidatePath(`/clients/${calendar.client.id}`);
  revalidatePath(`/calendars/${calendarId}`);
  redirect(`/calendars/${calendarId}`);
}

export async function archiveCalendar(calendarId: string) {
  const designer = await requireDesigner();
  const calendar = await getCalendar(calendarId);

  if (!calendar || !canAccessClient(designer, calendar.client)) {
    throw new Error("Você não tem acesso a este calendário.");
  }

  await adminPost(
    `/api/admin/calendars/${encodeURIComponent(calendarId)}/archive`,
  );

  revalidatePath("/");
  revalidatePath("/calendars");
  revalidatePath(`/clients/${calendar.client.id}`);
  redirect("/calendars");
}

export async function restoreCalendar(calendarId: string) {
  const designer = await requireDesigner();
  const calendar = await getCalendar(calendarId);

  if (!calendar || !canAccessClient(designer, calendar.client)) {
    throw new Error("Você não tem acesso a este calendário.");
  }

  await adminPost(
    `/api/admin/calendars/${encodeURIComponent(calendarId)}/restore`,
  );

  revalidatePath("/");
  revalidatePath("/calendars");
  revalidatePath(`/clients/${calendar.client.id}`);
  revalidatePath(`/calendars/${calendarId}`);
}

export async function createContentItem(formData: FormData) {
  const designer = await requireDesigner();
  const calendarId = required(formData, "calendarId");
  const calendar = await getCalendar(calendarId);

  if (!calendar || !canAccessClient(designer, calendar.client)) {
    throw new Error("Você não tem acesso a este calendário.");
  }

  const postingDate = required(formData, "postingDate");
  const postingTime = required(formData, "postingTime");
  const assetPaths = formData
    .getAll("assetPath")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const publishToFeed = formData.get("publishToFeed") === "on";
  const publishToStories = formData.get("publishToStories") === "on";

  if (!publishToFeed && !publishToStories) {
    throw new Error("Selecione Feed, Stories ou ambos.");
  }

  if (assetPaths.length === 0) {
    throw new Error("Selecione ao menos uma arte no Nextcloud.");
  }

  const scheduledAt = new Date(
    `${postingDate}T${postingTime}:00-03:00`
  ).toISOString();

  await adminPost("/api/admin/items", {
    calendarId,
    title: required(formData, "title"),
    postingDate,
    scheduledAt,
    contentType: required(formData, "contentType"),
    formatId: required(formData, "formatId"),
    publishToFeed,
    publishToStories,
    caption: required(formData, "caption"),
    assetPaths,
    channel: "INSTAGRAM"
  });

  revalidatePath("/calendars");
  revalidatePath(`/calendars/${calendarId}`);
  redirect(`/calendars/${calendarId}`);
}

export async function createContentFormat(formData: FormData) {
  await requireRole("ADMIN", "DEV");

  await adminPost("/api/admin/formats", {
    name: required(formData, "name"),
    contentType: required(formData, "contentType"),
    width: Number(required(formData, "width")),
    height: Number(required(formData, "height")),
    supportsFeed: formData.get("supportsFeed") === "on",
    supportsStories: formData.get("supportsStories") === "on",
    active: true
  });

  revalidatePath("/formats");
}

export async function updateContentFormat(formData: FormData) {
  await requireRole("ADMIN", "DEV");
  const formatId = required(formData, "formatId");

  await adminPatch(
    `/api/admin/formats/${encodeURIComponent(formatId)}`,
    {
      name: required(formData, "name"),
      contentType: required(formData, "contentType"),
      width: Number(required(formData, "width")),
      height: Number(required(formData, "height")),
      supportsFeed: formData.get("supportsFeed") === "on",
      supportsStories: formData.get("supportsStories") === "on",
      active: formData.get("active") === "on"
    }
  );

  revalidatePath("/formats");
  redirect("/formats");
}

export async function rotateCalendarToken(calendarId: string) {
  const designer = await requireDesigner();
  const calendar = await getCalendar(calendarId);

  if (!calendar || !canAccessClient(designer, calendar.client)) {
    throw new Error("Você não tem acesso a este calendário.");
  }

  await adminPost(
    `/api/admin/calendars/${encodeURIComponent(calendarId)}/rotate-token`,
  );

  revalidatePath(`/calendars/${calendarId}`);
}

export async function logoutDesigner() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await fetch(`${getApiUrl()}/api/auth/logout`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }).catch(() => undefined);
  }

  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
