#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
RUN_CHECKS="${RUN_CHECKS:-true}"
USE_PM2="${USE_PM2:-true}"

cd "${APP_DIR}"

if [[ ! -f ".env.production" && ! -f ".env" ]]; then
  echo "Missing .env.production or .env in ${APP_DIR}"
  echo "Copy deploy/env.production.example to .env.production and fill it first."
  exit 1
fi

# shellcheck disable=SC1091
source "${APP_DIR}/deploy/source-env.sh"

echo "==> Enabling Corepack"
corepack enable

echo "==> Installing dependencies"
corepack pnpm install --frozen-lockfile

if [[ "${DATABASE_URL:-}" == postgresql://* || "${DATABASE_URL:-}" == postgres://* ]]; then
  echo "==> Syncing PostgreSQL schema"
  corepack pnpm db:push:postgres
  corepack pnpm db:generate:postgres
else
  echo "==> Syncing default Prisma schema"
  corepack pnpm exec prisma db push
  corepack pnpm exec prisma generate
fi

if [[ "${RUN_CHECKS}" == "true" ]]; then
  echo "==> Running lint and type checks"
  corepack pnpm lint
  corepack pnpm exec tsc --noEmit
fi

echo "==> Building application"
corepack pnpm build

if [[ "${USE_PM2}" == "true" ]]; then
  if command -v pm2 >/dev/null 2>&1; then
    echo "==> Reloading PM2 processes"
    pm2 startOrReload deploy/ecosystem.config.cjs --update-env
    pm2 save
  else
    echo "PM2 is not installed. Install it with: npm install -g pm2"
    exit 1
  fi
fi

echo "==> Deployment complete"
echo "Web app wrapper: ${APP_DIR}/deploy/run-web.sh"
echo "Worker wrapper: ${APP_DIR}/deploy/run-worker.sh"
