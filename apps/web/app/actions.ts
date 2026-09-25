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
  await requireRole("ADMIN", "DEV");

  await adminPost("/api/admin/designers", {
    name: required(formData, "name"),
    email: required(formData, "email"),
    password: required(formData, "password"),
  });

  revalidatePath("/designers");
}

export async function createUser(formData: FormData) {
  const actor = await requireRole("ADMIN", "DEV");
  const role = required(formData, "role");

  if (actor.role === "ADMIN" && role !== "DESIGNER") {
    throw new Error("Administradores só podem criar usuários designers.");
  }

  await adminPost("/api/admin/users", {
    name: required(formData, "name"),
    email: required(formData, "email"),
    password: required(formData, "password"),
    role,
  });

  revalidatePath("/equipe");
}

export async function updateUser(formData: FormData) {
  const actor = await requireRole("ADMIN", "DEV");
  const userId = required(formData, "userId");
  const password = String(formData.get("password") ?? "").trim();
  const role = required(formData, "role");

  if (actor.role === "ADMIN" && role !== "DESIGNER") {
    throw new Error("Administradores só podem editar usuários designers.");
  }

  await adminPatch(`/api/admin/users/${encodeURIComponent(userId)}`, {
    name: required(formData, "name"),
    email: required(formData, "email"),
    role,
    ...(password ? { password } : {}),
  });

  revalidatePath("/equipe");
  revalidatePath("/");
  redirect("/equipe");
}

export async function setUserActive(formData: FormData) {
  const actor = await requireRole("ADMIN", "DEV");
  const userId = required(formData, "userId");
  const role = required(formData, "role");
  const active = required(formData, "active") === "true";

  if (actor.role === "ADMIN" && role !== "DESIGNER") {
    throw new Error("Administradores só podem alterar o acesso de designers.");
  }

  await adminPatch(
    `/api/admin/users/${encodeURIComponent(userId)}/active`,
    { active },
  );

  revalidatePath("/equipe");
  revalidatePath("/");
  redirect("/equipe");
}

export async function setClientActive(formData: FormData) {
  await requireRole("ADMIN", "DEV");
  const clientId = required(formData, "clientId");
  const active = required(formData, "active") === "true";

  await adminPatch(
    `/api/admin/clients/${encodeURIComponent(clientId)}/active`,
    { active },
  );

  revalidatePath("/");
  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/calendars");
  redirect(`/clients/${clientId}`);
}

export async function createClient(formData: FormData) {
  const designer = await requireDesigner();
  const selectedDesignerId = String(
    formData.get("assignedDesignerId") ?? "",
  ).trim();
  const postingWeekdays = formData
    .getAll("postingWeekday")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);

  if (postingWeekdays.length === 0) {
    throw new Error("Selecione ao menos um dia de publicação do cliente.");
  }

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
    postingWeekdays,
    toneOfVoice: String(formData.get("toneOfVoice") ?? "").trim() || undefined,
    targetAudience:
      String(formData.get("targetAudience") ?? "").trim() || undefined,
    region: String(formData.get("region") ?? "").trim() || undefined,
    services: String(formData.get("services") ?? "").trim() || undefined,
    objectives: String(formData.get("objectives") ?? "").trim() || undefined,
    prohibitedTerms:
      String(formData.get("prohibitedTerms") ?? "").trim() || undefined,
    hashtags: String(formData.get("hashtags") ?? "").trim() || undefined,
    references: String(formData.get("references") ?? "").trim() || undefined,
    mlabsProfileId:
      String(formData.get("mlabsProfileId") ?? "").trim() || undefined,
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
  const postingWeekdays = formData
    .getAll("postingWeekday")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);

  if (postingWeekdays.length === 0) {
    throw new Error("Selecione ao menos um dia de publicação do cliente.");
  }

  await adminPatch(`/api/admin/clients/${encodeURIComponent(clientId)}`, {
    name: required(formData, "name"),
    niche: required(formData, "niche"),
    phone: required(formData, "phone"),
    email: required(formData, "email"),
    nextcloudPath: String(formData.get("nextcloudPath") ?? "").trim(),
    postingWeekdays,
    toneOfVoice: String(formData.get("toneOfVoice") ?? "").trim(),
    targetAudience: String(formData.get("targetAudience") ?? "").trim(),
    region: String(formData.get("region") ?? "").trim(),
    services: String(formData.get("services") ?? "").trim(),
    objectives: String(formData.get("objectives") ?? "").trim(),
    prohibitedTerms: String(formData.get("prohibitedTerms") ?? "").trim(),
    hashtags: String(formData.get("hashtags") ?? "").trim(),
    references: String(formData.get("references") ?? "").trim(),
    mlabsProfileId: String(formData.get("mlabsProfileId") ?? "").trim(),
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

export async function createCommemorativeDate(formData: FormData) {
  await requireRole("ADMIN", "DEV");

  await adminPost("/api/admin/commemorative-dates", {
    name: required(formData, "name"),
    day: Number(required(formData, "day")),
    month: Number(required(formData, "month")),
    year: String(formData.get("year") ?? "").trim()
      ? Number(String(formData.get("year")))
      : undefined,
    city: String(formData.get("city") ?? "").trim() || undefined,
    state: String(formData.get("state") ?? "").trim() || undefined,
    description:
      String(formData.get("description") ?? "").trim() || undefined,
    tags: String(formData.get("tags") ?? "").trim() || undefined,
    clientId: String(formData.get("clientId") ?? "").trim() || undefined,
    active: true,
  });

  revalidatePath("/datas-comemorativas");
  revalidatePath("/calendars");
  redirect("/datas-comemorativas");
}

export async function updateCommemorativeDate(formData: FormData) {
  await requireRole("ADMIN", "DEV");
  const id = required(formData, "id");

  await adminPatch(
    `/api/admin/commemorative-dates/${encodeURIComponent(id)}`,
    {
      name: required(formData, "name"),
      day: Number(required(formData, "day")),
      month: Number(required(formData, "month")),
      year: String(formData.get("year") ?? "").trim()
        ? Number(String(formData.get("year")))
        : undefined,
      city: String(formData.get("city") ?? "").trim() || undefined,
      state: String(formData.get("state") ?? "").trim() || undefined,
      description:
        String(formData.get("description") ?? "").trim() || undefined,
      tags: String(formData.get("tags") ?? "").trim() || undefined,
      clientId: String(formData.get("clientId") ?? "").trim() || undefined,
      active: formData.get("active") === "on",
    },
  );

  revalidatePath("/datas-comemorativas");
  revalidatePath("/calendars");
  redirect("/datas-comemorativas");
}

export async function toggleCommemorativeDate(formData: FormData) {
  await requireRole("ADMIN", "DEV");
  const id = required(formData, "id");

  await adminPatch(
    `/api/admin/commemorative-dates/${encodeURIComponent(id)}`,
    {
      name: required(formData, "name"),
      day: Number(required(formData, "day")),
      month: Number(required(formData, "month")),
      year: String(formData.get("year") ?? "").trim()
        ? Number(String(formData.get("year")))
        : undefined,
      city: String(formData.get("city") ?? "").trim() || undefined,
      state: String(formData.get("state") ?? "").trim() || undefined,
      description:
        String(formData.get("description") ?? "").trim() || undefined,
      tags: String(formData.get("tags") ?? "").trim() || undefined,
      clientId: String(formData.get("clientId") ?? "").trim() || undefined,
      active: required(formData, "nextActive") === "true",
    },
  );

  revalidatePath("/datas-comemorativas");
  revalidatePath("/calendars");
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
    planningDueAt:
      String(formData.get("planningDueAt") ?? "").trim() || undefined,
    planningApprovalDueAt:
      String(formData.get("planningApprovalDueAt") ?? "").trim() || undefined,
    artworkDueAt:
      String(formData.get("artworkDueAt") ?? "").trim() || undefined,
    artworkApprovalDueAt:
      String(formData.get("artworkApprovalDueAt") ?? "").trim() || undefined,
    schedulingDueAt:
      String(formData.get("schedulingDueAt") ?? "").trim() || undefined,
    generateSkeleton: formData.get("generateSkeleton") !== "off",
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
      planningDueAt:
        String(formData.get("planningDueAt") ?? "").trim() || undefined,
      planningApprovalDueAt:
        String(formData.get("planningApprovalDueAt") ?? "").trim() || undefined,
      artworkDueAt:
        String(formData.get("artworkDueAt") ?? "").trim() || undefined,
      artworkApprovalDueAt:
        String(formData.get("artworkApprovalDueAt") ?? "").trim() || undefined,
      schedulingDueAt:
        String(formData.get("schedulingDueAt") ?? "").trim() || undefined,
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

export async function createPlanningItem(formData: FormData) {
  await requireRole("ADMIN", "DEV");
  const calendarId = required(formData, "calendarId");
  const postingDate = required(formData, "postingDate");
  const postingTime = required(formData, "postingTime");
  const publishToFeed = formData.get("publishToFeed") === "on";
  const publishToStories = formData.get("publishToStories") === "on";

  if (!publishToFeed && !publishToStories) {
    throw new Error("Selecione Feed, Stories ou ambos.");
  }

  const scheduledAt = new Date(
    `${postingDate}T${postingTime}:00-03:00`,
  ).toISOString();

  await adminPost(
    `/api/admin/calendars/${encodeURIComponent(calendarId)}/planning-items`,
    {
      title: required(formData, "title"),
      theme: required(formData, "theme"),
      headline: required(formData, "headline"),
      subheadline: String(formData.get("subheadline") ?? "").trim() || undefined,
      designerNotes:
        String(formData.get("designerNotes") ?? "").trim() || undefined,
      postingDate,
      scheduledAt,
      contentType: required(formData, "contentType"),
      publishToFeed,
      publishToStories,
      caption: required(formData, "caption"),
      channel: "INSTAGRAM",
    },
  );

  revalidatePath("/");
  revalidatePath("/calendars");
  revalidatePath(`/calendars/${calendarId}`);
  redirect(`/calendars/${calendarId}`);
}

export async function updatePlanningItem(formData: FormData) {
  await requireRole("ADMIN", "DEV");
  const calendarId = required(formData, "calendarId");
  const itemId = required(formData, "itemId");
  const postingDate = required(formData, "postingDate");
  const postingTime = required(formData, "postingTime");
  const publishToFeed = formData.get("publishToFeed") === "on";
  const publishToStories = formData.get("publishToStories") === "on";

  if (!publishToFeed && !publishToStories) {
    throw new Error("Selecione Feed, Stories ou ambos.");
  }

  const scheduledAt = new Date(
    `${postingDate}T${postingTime}:00-03:00`,
  ).toISOString();

  await adminPatch(
    `/api/admin/items/${encodeURIComponent(itemId)}/planning`,
    {
      title: required(formData, "title"),
      theme: required(formData, "theme"),
      headline: required(formData, "headline"),
      subheadline: String(formData.get("subheadline") ?? "").trim() || undefined,
      designerNotes:
        String(formData.get("designerNotes") ?? "").trim() || undefined,
      postingDate,
      scheduledAt,
      contentType: required(formData, "contentType"),
      publishToFeed,
      publishToStories,
      caption: required(formData, "caption"),
      channel: "INSTAGRAM",
    },
  );

  revalidatePath(`/calendars/${calendarId}`);
  redirect(`/calendars/${calendarId}`);
}

export async function submitPlanning(calendarId: string) {
  await requireRole("ADMIN", "DEV");

  await adminPost(
    `/api/admin/calendars/${encodeURIComponent(calendarId)}/submit-planning`,
  );

  revalidatePath("/");
  revalidatePath("/calendars");
  revalidatePath(`/calendars/${calendarId}`);
  redirect(`/calendars/${calendarId}`);
}

export async function attachArtwork(formData: FormData) {
  const designer = await requireDesigner();
  const calendarId = required(formData, "calendarId");
  const itemId = required(formData, "itemId");
  const calendar = await getCalendar(calendarId);

  if (!calendar || !canAccessClient(designer, calendar.client)) {
    throw new Error("Você não tem acesso a este calendário.");
  }

  const assetPaths = formData
    .getAll("assetPath")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (assetPaths.length === 0) {
    throw new Error("Selecione ao menos uma arte no Nextcloud.");
  }

  await adminPost(
    `/api/admin/items/${encodeURIComponent(itemId)}/artwork`,
    {
      formatId: required(formData, "formatId"),
      assetPaths,
    },
  );

  revalidatePath("/");
  revalidatePath("/calendars");
  revalidatePath(`/calendars/${calendarId}`);
  redirect(`/calendars/${calendarId}`);
}

export async function submitArtwork(calendarId: string) {
  const designer = await requireDesigner();
  const calendar = await getCalendar(calendarId);

  if (!calendar || !canAccessClient(designer, calendar.client)) {
    throw new Error("Você não tem acesso a este calendário.");
  }

  await adminPost(
    `/api/admin/calendars/${encodeURIComponent(calendarId)}/submit-artwork`,
  );

  revalidatePath("/");
  revalidatePath("/calendars");
  revalidatePath(`/calendars/${calendarId}`);
  redirect(`/calendars/${calendarId}`);
}

export async function markContentScheduled(formData: FormData) {
  await requireRole("ADMIN", "DEV");
  const calendarId = required(formData, "calendarId");
  const itemId = required(formData, "itemId");

  await adminPost(
    `/api/admin/items/${encodeURIComponent(itemId)}/scheduled`,
    {
      externalScheduleId:
        String(formData.get("externalScheduleId") ?? "").trim() || undefined,
    },
  );

  revalidatePath("/");
  revalidatePath(`/calendars/${calendarId}`);
  redirect(`/calendars/${calendarId}`);
}

export async function markContentPublished(formData: FormData) {
  await requireRole("ADMIN", "DEV");
  const calendarId = required(formData, "calendarId");
  const itemId = required(formData, "itemId");

  await adminPost(
    `/api/admin/items/${encodeURIComponent(itemId)}/published`,
  );

  revalidatePath("/");
  revalidatePath(`/calendars/${calendarId}`);
  redirect(`/calendars/${calendarId}`);
}

export async function markContentSchedulingError(formData: FormData) {
  await requireRole("ADMIN", "DEV");
  const calendarId = required(formData, "calendarId");
  const itemId = required(formData, "itemId");

  await adminPost(
    `/api/admin/items/${encodeURIComponent(itemId)}/scheduling-error`,
    {
      message: required(formData, "message"),
    },
  );

  revalidatePath("/");
  revalidatePath(`/calendars/${calendarId}`);
  redirect(`/calendars/${calendarId}`);
}

export async function createBriefingTemplate(formData: FormData) {
  await requireRole("ADMIN", "DEV");

  await adminPost("/api/admin/briefing-templates", {
    name: required(formData, "name"),
    description:
      String(formData.get("description") ?? "").trim() || undefined,
    niche: String(formData.get("niche") ?? "").trim() || undefined,
    contentType: required(formData, "contentType"),
    theme: String(formData.get("theme") ?? "").trim() || undefined,
    headline: String(formData.get("headline") ?? "").trim() || undefined,
    subheadline:
      String(formData.get("subheadline") ?? "").trim() || undefined,
    caption: String(formData.get("caption") ?? "").trim() || undefined,
    designerNotes:
      String(formData.get("designerNotes") ?? "").trim() || undefined,
    publishToFeed: formData.get("publishToFeed") === "on",
    publishToStories: formData.get("publishToStories") === "on",
    active: true,
  });

  revalidatePath("/modelos");
  redirect("/modelos");
}

export async function updateBriefingTemplate(formData: FormData) {
  await requireRole("ADMIN", "DEV");
  const id = required(formData, "id");

  await adminPatch(
    `/api/admin/briefing-templates/${encodeURIComponent(id)}`,
    {
      name: required(formData, "name"),
      description:
        String(formData.get("description") ?? "").trim() || undefined,
      niche: String(formData.get("niche") ?? "").trim() || undefined,
      contentType: required(formData, "contentType"),
      theme: String(formData.get("theme") ?? "").trim() || undefined,
      headline: String(formData.get("headline") ?? "").trim() || undefined,
      subheadline:
        String(formData.get("subheadline") ?? "").trim() || undefined,
      caption: String(formData.get("caption") ?? "").trim() || undefined,
      designerNotes:
        String(formData.get("designerNotes") ?? "").trim() || undefined,
      publishToFeed: formData.get("publishToFeed") === "on",
      publishToStories: formData.get("publishToStories") === "on",
      active: formData.get("active") === "on",
    },
  );

  revalidatePath("/modelos");
  redirect("/modelos");
}

export async function addContentComment(formData: FormData) {
  const designer = await requireDesigner();
  const calendarId = required(formData, "calendarId");
  const itemId = required(formData, "itemId");
  const calendar = await getCalendar(calendarId);

  if (!calendar || !canAccessClient(designer, calendar.client)) {
    throw new Error("Você não tem acesso a este conteúdo.");
  }

  await adminPost(
    `/api/admin/items/${encodeURIComponent(itemId)}/comments`,
    {
      message: required(formData, "message"),
      visibleToClient: formData.get("visibleToClient") === "on",
    },
  );

  revalidatePath(`/calendars/${calendarId}`);
  revalidatePath(`/calendars/${calendarId}/content/${itemId}`);
}

export async function updateContentMetrics(formData: FormData) {
  await requireRole("ADMIN", "DEV");
  const calendarId = required(formData, "calendarId");
  const itemId = required(formData, "itemId");

  const numberValue = (name: string) => {
    const raw = String(formData.get(name) ?? "").trim();
    return raw ? Number(raw) : undefined;
  };

  await adminPatch(
    `/api/admin/items/${encodeURIComponent(itemId)}/metrics`,
    {
      reach: numberValue("reach"),
      impressions: numberValue("impressions"),
      likes: numberValue("likes"),
      comments: numberValue("comments"),
      shares: numberValue("shares"),
      saves: numberValue("saves"),
    },
  );

  revalidatePath(`/calendars/${calendarId}`);
  revalidatePath(`/calendars/${calendarId}/content/${itemId}`);
  revalidatePath("/relatorios");
}

export async function markNotificationRead(formData: FormData) {
  await requireDesigner();
  const id = required(formData, "notificationId");
  const returnTo = String(formData.get("returnTo") ?? "/notificacoes");

  await adminPost(
    `/api/admin/notifications/${encodeURIComponent(id)}/read`,
  );

  revalidatePath("/notificacoes");
  revalidatePath("/");
  redirect(returnTo);
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

export async function moveContentItem(formData: FormData) {
  const designer = await requireDesigner();
  const calendarId = required(formData, "calendarId");
  const itemId = required(formData, "itemId");
  const calendar = await getCalendar(calendarId);

  if (!calendar || !canAccessClient(designer, calendar.client)) {
    throw new Error("Você não tem acesso a este calendário.");
  }

  const postingDate = required(formData, "postingDate");
  const postingTime = required(formData, "postingTime");
  const scheduledAt = new Date(
    `${postingDate}T${postingTime}:00-03:00`
  ).toISOString();

  await adminPatch(
    `/api/admin/items/${encodeURIComponent(itemId)}/schedule`,
    {
      postingDate,
      scheduledAt
    }
  );

  revalidatePath("/calendars");
  revalidatePath(`/calendars/${calendarId}`);
  redirect(`/calendars/${calendarId}?item=${encodeURIComponent(itemId)}`);
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
