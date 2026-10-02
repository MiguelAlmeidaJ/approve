export const USER_PERMISSIONS = [
  "CLIENTS_MANAGE",
  "CALENDARS_MANAGE",
  "CONTENT_MANAGE",
  "PRODUCTION_MANAGE",
  "STANDALONE_MANAGE",
  "SCHEDULING_MANAGE",
  "REPORTS_VIEW"
] as const;

export type UserPermission = (typeof USER_PERMISSIONS)[number];

export const DEFAULT_DESIGNER_PERMISSIONS: UserPermission[] = [
  "CONTENT_MANAGE",
  "PRODUCTION_MANAGE",
  "STANDALONE_MANAGE"
];

export function normalizeUserPermissions(value: unknown): UserPermission[] {
  const source = Array.isArray(value) ? value : DEFAULT_DESIGNER_PERMISSIONS;
  const allowed = new Set<string>(USER_PERMISSIONS);

  return [...new Set(
    source.filter(
      (permission): permission is UserPermission =>
        typeof permission === "string" && allowed.has(permission)
    )
  )];
}
