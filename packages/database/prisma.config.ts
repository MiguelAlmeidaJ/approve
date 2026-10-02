import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "prisma/config";

const packageDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceEnvPath = path.resolve(packageDirectory, "../../.env");

// Prisma runs filtered workspace commands from packages/database. Load the
// workspace environment in that case, while preserving values supplied by CI.
if (!process.env.DATABASE_URL && existsSync(workspaceEnvPath)) {
  process.loadEnvFile(workspaceEnvPath);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
