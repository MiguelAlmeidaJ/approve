export type ContentStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "CHANGES_REQUESTED";

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

export type Calendar = {
  id: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  shareToken: string;
  contentItems: ContentItem[];
};

export type Client = {
  id: string;
  name: string;
  slug: string;
  calendars: Calendar[];
};

export type PublicCalendar = Calendar & {
  client: {
    id: string;
    name: string;
    slug: string;
  };
};

const API_URL = process.env.API_URL ?? "http://localhost:3333";

export async function getDashboard(): Promise<Client[]> {
  const response = await fetch(`${API_URL}/api/admin/dashboard`, {
    headers: {
      "x-admin-key": process.env.API_ADMIN_KEY ?? ""
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(
      `Falha ao carregar painel: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<Client[]>;
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
