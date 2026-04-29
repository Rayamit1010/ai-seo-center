/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");

const appRoot = path.resolve(__dirname, "..");

module.exports = {
  apps: [
    {
      name: "seo-command-center-web",
      cwd: appRoot,
      script: "./deploy/run-web.sh",
      interpreter: "none",
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 3000,
      },
    },
    {
      name: "seo-command-center-worker",
      cwd: appRoot,
      script: "./deploy/run-worker.sh",
      interpreter: "none",
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
