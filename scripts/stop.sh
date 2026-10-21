#!/usr/bin/env bash
# Stop the production stack. Data volumes (Postgres, MinIO) are kept.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")/.." && pwd)"
cd "$REPO_ROOT"

docker compose -f docker-compose.prod.yml down
