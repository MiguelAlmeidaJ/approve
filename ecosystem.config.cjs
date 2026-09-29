const path = require("node:path");

const webCwd = path.join(__dirname, "apps", "web");
const nextBin = require.resolve("next/dist/bin/next", {
  paths: [webCwd]
});

module.exports = {
  apps: [
    {
      name: "approve-api",
      cwd: path.join(__dirname, "apps", "api"),
      script: "dist/main.js",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        API_PORT: 3333
      }
    },
    {
      name: "approve-web",
      cwd: webCwd,
      script: nextBin,
      args: "start -p 3000",
      interpreter: "node",
      windowsHide: true,
      env: {
        NODE_ENV: "production",
        WEB_PORT: 3000
      }
    }
  ]
};
