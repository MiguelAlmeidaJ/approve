import { cookies } from "next/headers";

export type UserRole = "DEV" | "ADMIN" | "DESIGNER";
export type CommemorativeScope = "NATIONAL" | "CUSTOM";
export type CommentAuthorType = "INTERNAL" | "CLIENT" | "SYSTEM";
export type NotificationType =
  | "INFO"
  | "ACTION"
  | "APPROVAL"
  | "CHANGE"
  | "DEADLINE"
  | "PUBLISHING";
export type ContentType = "POST" | "CAROUSEL" | "REEL" | "STORY";

export type ContentStatus =
  "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "CHANGES_REQUESTED";

export type CalendarStage =
  | "PLANNING"
  | "PRE_APPROVAL"
  | "PRODUCTION"
  | "FINAL_APPROVAL"
  | "SCHEDULING"
  | "COMPLETED"
  | "ARCHIVED";

export type ContentStage =
  | "PLANNING"
  | "PRE_APPROVAL_PENDING"
  | "PRE_APPROVED"
  | "PRE_CHANGES_REQUESTED"
  | "DESIGN_PENDING"
  | "DESIGN_IN_PROGRESS"
  | "ART_APPROVAL_PENDING"
  | "ART_CHANGES_REQUESTED"
  | "ART_APPROVED"
  | "READY_TO_SCHEDULE"
  | "SCHEDULED"
  | "PUBLISHED"
  | "SCHEDULING_ERROR";

export type ApprovalPhase = "PLANNING" | "ARTWORK";

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
  version: number;
  active: boolean;
  createdAt: string;
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
  theme: string | null;
  headline: string | null;
  subheadline: string | null;
  designerNotes: string | null;
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
  stage: ContentStage;
  reviewedAt: string | null;
  planningApprovedAt: string | null;
  artworkApprovedAt: string | null;
  externalScheduleId: string | null;
  publishedAt: string | null;
  publishingError: string | null;
  planningReady: boolean;
  artworkVersion: number;
  metricReach: number | null;
  metricImpressions: number | null;
  metricLikes: number | null;
  metricComments: number | null;
  metricShares: number | null;
  metricSaves: number | null;
  metricsUpdatedAt: string | null;
  reviews?: Array<{
    id: string;
    action: "APPROVED" | "CHANGES_REQUESTED";
    phase: ApprovalPhase;
    message: string | null;
    reviewerName: string | null;
    createdAt: string;
  }>;
  comments?: Array<{
    id: string;
    authorType: CommentAuthorType;
    authorName: string | null;
    message: string;
    visibleToClient?: boolean;
    createdAt: string;
    authorDesigner?: {
      id: string;
      name: string;
      role: UserRole;
    } | null;
  }>;
};

export type Designer = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  mustChangePassword: boolean;
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

export type ClientPostingWeekday = {
  id: string;
  weekday: number;
};

export type CommemorativeDate = {
  id: string;
  name: string;
  day: number;
  month: number;
  year: number | null;
  scope: CommemorativeScope;
  city: string | null;
  state: string | null;
  description: string | null;
  tags: string | null;
  clientId: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    name: string;
  } | null;
};

export type UserListItem = DesignerListItem;

export type BriefingTemplate = {
  id: string;
  name: string;
  description: string | null;
  niche: string | null;
  contentType: ContentType;
  theme: string | null;
  headline: string | null;
  subheadline: string | null;
  caption: string | null;
  designerNotes: string | null;
  publishToFeed: boolean;
  publishToStories: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Notification = {
  id: string;
  designerId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

export type ArtworkVersionResult = {
  id: string;
  artworkVersion: number;
  assets: ContentAsset[];
};


export type Calendar = {
  id: string;
  clientId: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  shareToken: string;
  stage: CalendarStage;
  planningDueAt: string | null;
  planningApprovalDueAt: string | null;
  artworkDueAt: string | null;
  artworkApprovalDueAt: string | null;
  schedulingDueAt: string | null;
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
  toneOfVoice: string | null;
  targetAudience: string | null;
  region: string | null;
  services: string | null;
  objectives: string | null;
  prohibitedTerms: string | null;
  hashtags: string | null;
  references: string | null;
  mlabsProfileId: string | null;
  active: boolean;
  credential?: {
    email: string;
  } | null;
  assignedDesigner?: Designer | null;
  postingWeekdays: ClientPostingWeekday[];
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
    toneOfVoice: string | null;
    targetAudience: string | null;
    region: string | null;
    services: string | null;
    objectives: string | null;
    prohibitedTerms: string | null;
    hashtags: string | null;
    references: string | null;
    mlabsProfileId: string | null;

    active: boolean;
    credential?: {
      email: string;
    } | null;
    assignedDesigner?: Designer | null;
    postingWeekdays: ClientPostingWeekday[];
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
    stage: CalendarStage;
    contentItems: Array<{
      id: string;
      status: ContentStatus;
      stage: ContentStage;
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

export async function getBriefingTemplates(): Promise<BriefingTemplate[]> {
  return (
    (await adminGet<BriefingTemplate[]>("/api/admin/briefing-templates")) ?? []
  );
}

export async function getNotifications(): Promise<Notification[]> {
  return (await adminGet<Notification[]>("/api/admin/notifications")) ?? [];
}

export function getArtworkVersions(itemId: string) {
  return adminGet<ArtworkVersionResult>(
    `/api/admin/items/${encodeURIComponent(itemId)}/artwork-versions`
  );
}

export async function getCommemorativeDates(): Promise<CommemorativeDate[]> {
  return (
    (await adminGet<CommemorativeDate[]>("/api/admin/commemorative-dates")) ??
    []
  );
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
