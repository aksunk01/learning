#!/usr/bin/env bash
# Spin up the full local dev environment: postgres/redis/minio via docker
# compose, apply alembic migrations, then start the backend (uvicorn) and
# frontend (next dev) as background processes.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [ ! -f .env ]; then
  echo "Missing .env at repo root - create one (see .env.docker.example) before running this." >&2
  exit 1
fi

set -a
source .env
set +a

LOG_DIR="$REPO_ROOT/.dev"
mkdir -p "$LOG_DIR"

echo "==> Starting infra (postgres, redis, minio) via docker compose"
docker compose up -d

echo "==> Waiting for postgres to accept connections"
for _ in $(seq 1 30); do
  if docker exec academic-postgres pg_isready -U "$POSTGRES_USER" >/dev/null 2>&1; then
    echo "    postgres is ready"
    break
  fi
  sleep 1
done

echo "==> Applying database migrations"
(cd backend && .venv/bin/python -m alembic upgrade head)

if pgrep -f "uvicorn app.main:app" >/dev/null 2>&1; then
  echo "==> Backend already running - skipping"
else
  echo "==> Starting backend (uvicorn) on :8000"
  (cd backend && nohup .venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > "$LOG_DIR/backend.log" 2>&1 &)
fi

if pgrep -f "node .*next dev" >/dev/null 2>&1 || pgrep -f "next-server" >/dev/null 2>&1; then
  echo "==> Frontend already running - skipping"
else
  echo "==> Starting frontend (next dev) on :3000"
  (cd frontend && nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 &)
fi

echo "==> Waiting for backend to respond"
for _ in $(seq 1 30); do
  if curl -s -m 2 http://localhost:8000/health >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo
echo "Backend health:"
curl -s -m 5 http://localhost:8000/health && echo || echo "  not responding yet - check $LOG_DIR/backend.log"

echo "Frontend:"
curl -s -m 5 -o /dev/null -w "  HTTP %{http_code}\n" http://localhost:3000/ || echo "  not responding yet - check $LOG_DIR/frontend.log"

echo
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "Logs:     $LOG_DIR/backend.log, $LOG_DIR/frontend.log"
echo "Stop everything with: scripts/dev-down.sh"
