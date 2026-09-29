const path = require("node:path");

const webCwd = path.join(__dirname, "apps", "web");
const nextBin = require.resolve("next/dist/bin/next", {
  paths: [webCwd]
});
const apiPort = process.env.API_PORT || "3333";
const webPort = process.env.WEB_PORT || "3000";

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
