import type { UserRole } from "@approve/database";

export type InternalActor = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type InternalActorRequest = {
  headers: Record<string, string | string[] | undefined>;
  actor: InternalActor;
};
