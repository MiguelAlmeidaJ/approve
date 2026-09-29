import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pm2Bin = require.resolve("pm2/bin/pm2");
const pnpmBin = process.env.npm_execpath;

if (!pnpmBin) {
  console.error("N\u00e3o foi poss\u00edvel localizar o pnpm. Execute este script com pnpm update:pm2.");
  process.exit(1);
}

function run(label, script, args, { allowFailure = false } = {}) {
  console.log(`\n[update:pm2] ${label}`);

  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit",
    windowsHide: true
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0 && !allowFailure) {
    process.exit(result.status ?? 1);
  }
}

run("parando a API", pm2Bin, ["stop", "approve-api"], { allowFailure: true });
run("parando o web", pm2Bin, ["stop", "approve-web"], { allowFailure: true });
run("aplicando migrations", pnpmBin, ["db:deploy"]);
run("executando o build", pnpmBin, ["build"]);
run("iniciando os processos", pm2Bin, [
  "startOrReload",
  path.join(rootDir, "ecosystem.config.cjs"),
  "--update-env"
]);
run("salvando o estado do PM2", pm2Bin, ["save"]);

console.log("\n[update:pm2] atualiza\u00e7\u00e3o conclu\u00edda.");
