#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

resolve_env_file() {
  if [[ -n "${ENV_FILE:-}" && -f "${ENV_FILE}" ]]; then
    printf '%s\n' "${ENV_FILE}"
    return
  fi

  if [[ -f "${APP_DIR}/.env.production" ]]; then
    printf '%s\n' "${APP_DIR}/.env.production"
    return
  fi

  if [[ -f "${APP_DIR}/.env" ]]; then
    printf '%s\n' "${APP_DIR}/.env"
    return
  fi
}

ENV_PATH="$(resolve_env_file || true)"

if [[ -n "${ENV_PATH}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_PATH}"
  set +a
fi

export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-3000}"
