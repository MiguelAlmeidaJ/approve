import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const command = process.argv[2] ?? "dev";

const port =
  process.env.WEB_PORT ??
  (command === "start" ? process.env.PORT : undefined) ??
  (command === "dev" ? "5005" : "3000");

const child = spawn(
  process.execPath,
  [nextBin, command, "-p", port],
  {
    stdio: "inherit",
    env: process.env
  }
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
