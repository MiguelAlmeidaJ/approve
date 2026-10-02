import type { UserPermission, UserRole } from "@approve/database";

export type InternalActor = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: UserPermission[];
};

export type InternalActorRequest = {
  headers: Record<string, string | string[] | undefined>;
  actor: InternalActor;
};
