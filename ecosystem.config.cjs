const path = require("node:path");

process.loadEnvFile(path.join(__dirname, ".env"));

function requirePort(name) {
  const value = process.env[name];
  const port = Number(value);

  if (!value || !/^\d+$/.test(value) || port < 1 || port > 65535) {
    throw new Error(`${name} deve estar definida no .env com uma porta entre 1 e 65535.`);
  }

  return value;
}

const webCwd = path.join(__dirname, "apps", "web");
const nextBin = require.resolve("next/dist/bin/next", {
  paths: [webCwd]
});
const apiPort = requirePort("API_PORT");
const webPort = requirePort("WEB_PORT");

module.exports = {
  apps: [
    {
      name: "approve-api",
      cwd: path.join(__dirname, "apps", "api"),
      script: "dist/main.js",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        API_PORT: apiPort
      }
    },
    {
      name: "approve-web",
      cwd: webCwd,
      script: nextBin,
      args: ["start", "-p", webPort],
      interpreter: "node",
      windowsHide: true,
      env: {
        NODE_ENV: "production",
        WEB_PORT: webPort
      }
    }
  ]
};
