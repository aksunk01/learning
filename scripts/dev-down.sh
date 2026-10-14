#!/usr/bin/env bash
# Spin down the local dev environment started by dev-up.sh: stop the
# backend/frontend dev processes, then stop the docker compose infra.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> Stopping backend"
pkill -f "uvicorn app.main:app" 2>/dev/null && echo "    stopped" || echo "    not running"

echo "==> Stopping frontend"
pkill -f "next dev" 2>/dev/null && echo "    stopped (next dev)" || true
pkill -f "next-server" 2>/dev/null && echo "    stopped (next-server)" || true

echo "==> Stopping infra (postgres, redis, minio)"
docker compose down

echo "==> Done"
