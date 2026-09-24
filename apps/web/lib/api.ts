import { cookies } from "next/headers";

export type UserRole = "DEV" | "ADMIN" | "DESIGNER";
export type ContentType = "POST" | "CAROUSEL" | "REEL" | "STORY";

export type ContentStatus =
  "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "CHANGES_REQUESTED";

export type ContentFormat = {
  id: string;
  name: string;
  contentType: ContentType;
  width: number;
  height: number;
  supportsFeed: boolean;
  supportsStories: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ContentAsset = {
  id: string;
  provider: "NEXTCLOUD";
  filePath: string;
  fileName: string;
  fileId: string | null;
  mimeType: string | null;
  etag: string | null;
  sortOrder: number;
};

export type NextcloudFileItem = {
  name: string;
  path: string;
  isDirectory: boolean;
  mimeType: string | null;
  etag: string | null;
  fileId: string | null;
  size: number | null;
};

export type ContentItem = {
  id: string;
  title: string;
  scheduledAt: string;
  channel: string;
  contentType: ContentType;
  format: string;
  formatId: string | null;
  formatPreset?: ContentFormat | null;
  publishToFeed: boolean;
  publishToStories: boolean;
  caption: string;
  assetUrl: string | null;
  assets: ContentAsset[];
  status: ContentStatus;
  reviewedAt: string | null;
  reviews?: Array<{
    id: string;
    action: "APPROVED" | "CHANGES_REQUESTED";
    message: string | null;
    reviewerName: string | null;
    createdAt: string;
  }>;
};

export type Designer = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
};

export type DesignerListItem = Designer & {
  createdAt: string;
  _count: {
    clients: number;
  };
};

export type CalendarPostingDay = {
  id: string;
  scheduledDate: string;
};

export type UserListItem = DesignerListItem;

export type Calendar = {
  id: string;
  clientId: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  shareToken: string;
  archivedAt: string | null;
  postingDays: CalendarPostingDay[];
  contentItems: ContentItem[];
};

export type Client = {
  id: string;
  name: string;
  slug: string;
  niche: string | null;
  phone: string | null;
  nextcloudPath: string | null;
  assignedDesignerId: string | null;
  active: boolean;
  credential?: {
    email: string;
  } | null;
  assignedDesigner?: Designer | null;
  calendars: Calendar[];
};

export type CalendarWithClient = Calendar & {
  client: {
    id: string;
    name: string;
    slug: string;
    niche: string | null;
    phone: string | null;
    nextcloudPath: string | null;
    assignedDesignerId: string | null;
    active: boolean;
    credential?: {
      email: string;
    } | null;
    assignedDesigner?: Designer | null;
  };
};

export type PublicCalendar = CalendarWithClient;

export type ClientPortal = {
  id: string;
  name: string;
  slug: string;
  niche: string | null;
  phone: string | null;
  active: boolean;
  credential: {
    email: string;
  } | null;
  calendars: Array<{
    id: string;
    title: string;
    periodStart: string;
    periodEnd: string;
    shareToken: string;
    contentItems: Array<{
      id: string;
      status: ContentStatus;
    }>;
  }>;
};

const API_URL = process.env.API_URL ?? "http://localhost:4334";
const DESIGNER_SESSION_COOKIE = "ta_designer_session";
const CLIENT_SESSION_COOKIE = "ta_client_session";

async function adminHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get(DESIGNER_SESSION_COOKIE)?.value;

  return {
    "x-admin-key": process.env.API_ADMIN_KEY ?? "",
    ...(token ? { authorization: `Bearer ${token}` } : {})
  };
}

async function adminGet<T>(path: string): Promise<T | null> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: await adminHeaders(),
    cache: "no-store"
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Falha ao carregar dados: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}

export async function getDashboard(): Promise<Client[]> {
  return (await adminGet<Client[]>("/api/admin/dashboard")) ?? [];
}

export async function getAccessibleClients(
  _designer: Designer
): Promise<Client[]> {
  return getDashboard();
}

export async function getDesigners(): Promise<DesignerListItem[]> {
  return (await adminGet<DesignerListItem[]>("/api/admin/designers")) ?? [];
}

export async function getUsers(): Promise<UserListItem[]> {
  return (await adminGet<UserListItem[]>("/api/admin/users")) ?? [];
}

export async function getFormats(): Promise<ContentFormat[]> {
  return (await adminGet<ContentFormat[]>("/api/admin/formats")) ?? [];
}

export function getClient(id: string) {
  return adminGet<Client>(`/api/admin/clients/${encodeURIComponent(id)}`);
}

export function getCalendar(id: string) {
  return adminGet<CalendarWithClient>(
    `/api/admin/calendars/${encodeURIComponent(id)}`
  );
}

export function canAccessClient(
  designer: Designer,
  client: Pick<Client, "assignedDesignerId">
) {
  return (
    designer.role !== "DESIGNER" || client.assignedDesignerId === designer.id
  );
}

export async function getPublicCalendar(
  token: string
): Promise<PublicCalendar | null> {
  const response = await fetch(
    `${API_URL}/api/public/calendars/${encodeURIComponent(token)}`,
    {
      cache: "no-store"
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Falha ao carregar calendário: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<PublicCalendar>;
}

export function getApiUrl() {
  return API_URL;
}
