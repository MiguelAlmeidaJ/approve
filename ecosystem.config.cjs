module.exports = {
  apps: [
    {
      name: "approve-api",
      cwd: __dirname,
      script: "pnpm",
      args: "--filter @approve/api start:prod",
      env: {
        NODE_ENV: "production",
        API_PORT: 3333
      }
    },
    {
      name: "approve-web",
      cwd: __dirname,
      script: "pnpm",
      args: "--filter @approve/web start",
      env: {
        NODE_ENV: "production",
        WEB_PORT: 3000
      }
    }
  ]
};
