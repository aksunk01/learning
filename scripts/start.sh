#!/usr/bin/env bash
# Build (if code changed) and start the production stack, then verify that
# the database is migrated to head and both apps are reachable on Tailscale.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")/.." && pwd)"
cd "$REPO_ROOT"

COMPOSE=(docker compose -f docker-compose.prod.yml)
TIMEOUT_SECONDS=120

log() { printf '\n==> %s\n' "$*"; }
fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

# Retries "$@" once per second until it succeeds or TIMEOUT_SECONDS passes.
wait_for() {
  local description="$1"; shift
  local waited=0
  until "$@" >/dev/null 2>&1; do
    if (( waited >= TIMEOUT_SECONDS )); then
      fail "timed out after ${TIMEOUT_SECONDS}s waiting for ${description}"
    fi
    sleep 1
    waited=$((waited + 1))
  done
  echo "ok: ${description}"
}

[[ -f .env ]] || fail ".env not found in ${REPO_ROOT} (see .env.docker.example)"
set -a; source .env; set +a
for var in POSTGRES_USER POSTGRES_DB TS_HOSTNAME_BACKEND TS_HOSTNAME_FRONTEND \
           TS_AUTHKEY_BACKEND TS_AUTHKEY_FRONTEND; do
  [[ -n "${!var:-}" ]] || fail "${var} is not set in .env"
done

log "Building and starting containers"
"${COMPOSE[@]}" up -d --build

log "Waiting for Postgres"
wait_for "postgres accepting connections" \
  "${COMPOSE[@]}" exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"

# The backend shares the tailscale-backend sidecar's network namespace, so
# probe it from there. The backend entrypoint runs `alembic upgrade head`
# before uvicorn starts, so a responding server means migrations succeeded.
log "Waiting for backend (runs migrations on startup)"
wait_for "backend responding on :8000" \
  "${COMPOSE[@]}" exec -T tailscale-backend wget -q -O /dev/null http://127.0.0.1:8000/docs

# Run upgrade again explicitly: if the backend image didn't change, compose
# leaves the old container running and its entrypoint never re-runs.
log "Applying database migrations"
"${COMPOSE[@]}" exec -T backend alembic upgrade head
current="$("${COMPOSE[@]}" exec -T backend alembic current 2>/dev/null | awk '{print $1}' | sort)"
heads="$("${COMPOSE[@]}" exec -T backend alembic heads 2>/dev/null | awk '{print $1}' | sort)"
[[ -n "$heads" && "$current" == "$heads" ]] \
  || fail "database revision (${current:-none}) does not match alembic head (${heads:-none})"
echo "ok: database at head (${heads//$'\n'/, })"

log "Waiting for frontend"
wait_for "frontend responding on :3000" \
  "${COMPOSE[@]}" exec -T tailscale-frontend wget -q -O /dev/null http://127.0.0.1:3000/

log "Checking Tailscale"
for sidecar in tailscale-backend tailscale-frontend; do
  wait_for "${sidecar} logged in to tailnet" \
    sh -c "${COMPOSE[*]} exec -T ${sidecar} tailscale status --json | grep -q '\"BackendState\": \"Running\"'"
done
wait_for "http://${TS_HOSTNAME_BACKEND} reachable over tailnet" \
  curl -fsS -o /dev/null --max-time 5 "http://${TS_HOSTNAME_BACKEND}/docs"
wait_for "http://${TS_HOSTNAME_FRONTEND} reachable over tailnet" \
  curl -fsS -o /dev/null --max-time 5 "http://${TS_HOSTNAME_FRONTEND}/"

log "Container status"
"${COMPOSE[@]}" ps

log "Dueboard is up"
echo "Frontend: http://${TS_HOSTNAME_FRONTEND}"
echo "Backend:  http://${TS_HOSTNAME_BACKEND}"
