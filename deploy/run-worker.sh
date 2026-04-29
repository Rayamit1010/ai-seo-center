#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# shellcheck disable=SC1091
source "${APP_DIR}/deploy/source-env.sh"

cd "${APP_DIR}"
exec corepack pnpm jobs:daemon
