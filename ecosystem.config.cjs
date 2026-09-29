module.exports = {
  apps: [
    {
      name: "approve-api",
      cwd: require("node:path").join(__dirname, "apps", "api"),
      script: "dist/main.js",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        API_PORT: 3333
      }
    },
    {
      name: "approve-web",
      cwd: require("node:path").join(__dirname, "apps", "web"),
      script: "scripts/next.mjs",
      args: "start",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        WEB_PORT: 3000
      }
    }
  ]
};
