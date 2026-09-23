export type UserRole = "DEV" | "ADMIN" | "DESIGNER";

export type ContentStatus =
  "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "CHANGES_REQUESTED";

export type ContentItem = {
  id: string;
  title: string;
  scheduledAt: string;
  channel: string;
  format: string;
  caption: string;
  assetUrl: string | null;
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
  postingDays: CalendarPostingDay[];
  contentItems: ContentItem[];
};

export type Client = {
  id: string;
  name: string;
  slug: string;
  assignedDesignerId: string | null;
  assignedDesigner?: Designer | null;
  calendars: Calendar[];
};

export type CalendarWithClient = Calendar & {
  client: {
    id: string;
    name: string;
    slug: string;
    assignedDesignerId: string | null;
    assignedDesigner?: Designer | null;
  };
};

export type PublicCalendar = CalendarWithClient;

const API_URL = process.env.API_URL ?? "http://localhost:4334";

async function adminGet<T>(path: string): Promise<T | null> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "x-admin-key": process.env.API_ADMIN_KEY ?? "",
    },
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Falha ao carregar dados: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}

export async function getDashboard(): Promise<Client[]> {
  return (await adminGet<Client[]>("/api/admin/dashboard")) ?? [];
}

export async function getAccessibleClients(
  designer: Designer,
): Promise<Client[]> {
  const clients = await getDashboard();

  if (designer.role !== "DESIGNER") {
    return clients;
  }

  return clients.filter((client) => client.assignedDesignerId === designer.id);
}

export async function getDesigners(): Promise<DesignerListItem[]> {
  return (await adminGet<DesignerListItem[]>("/api/admin/designers")) ?? [];
}

export async function getUsers(): Promise<UserListItem[]> {
  return (await adminGet<UserListItem[]>("/api/admin/users")) ?? [];
}

export function getClient(id: string) {
  return adminGet<Client>(`/api/admin/clients/${encodeURIComponent(id)}`);
}

export function getCalendar(id: string) {
  return adminGet<CalendarWithClient>(
    `/api/admin/calendars/${encodeURIComponent(id)}`,
  );
}

export function canAccessClient(
  designer: Designer,
  client: Pick<Client, "assignedDesignerId">,
) {
  return (
    designer.role !== "DESIGNER" || client.assignedDesignerId === designer.id
  );
}

export async function getPublicCalendar(
  token: string,
): Promise<PublicCalendar | null> {
  const response = await fetch(
    `${API_URL}/api/public/calendars/${encodeURIComponent(token)}`,
    {
      cache: "no-store",
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Falha ao carregar calendário: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<PublicCalendar>;
}

export function getApiUrl() {
  return API_URL;
}
