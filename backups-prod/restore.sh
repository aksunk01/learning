#!/usr/bin/env bash
# Restore the container data (Postgres, MinIO, Redis) from a snapshot made by
# backup.sh into this machine's data containers.
# Usage: backups-prod/restore.sh backups-prod/<timestamp>
#
# This is not a server migration: it never copies .env or Tailscale state and
# never starts the backend, frontend or Tailscale sidecars. Only the data
# containers are created and started. Run it on a machine with this repo
# checked out, its own .env, and no existing containers for this compose
# project; it refuses to overwrite data that already exists.
set -euo pipefail

BACKUP_ROOT="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"
REPO_ROOT="$(cd "$BACKUP_ROOT/.." && pwd)"
SRC="$(cd "${1:?usage: $0 <snapshot-dir>}" && pwd)"
cd "$REPO_ROOT"

COMPOSE=(docker compose -f docker-compose.prod.yml)
DATA_SERVICES=(postgres redis minio)
TIMEOUT_SECONDS=120

log() { printf '\n==> %s\n' "$*"; }
fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

container_id() { "${COMPOSE[@]}" ps -aq "$1"; }

# Extracts archive $3 into the volume mounted at $2 in service $1's container.
restore_volume() {
  local service="$1" path="$2" archive="$3" cid
  cid="$(container_id "$service")"
  docker run --rm --volumes-from "$cid" -v "$SRC":/backup:ro alpine sh -c \
    "[ -z \"\$(ls -A '$path')\" ] || { echo '$service $path is not empty' >&2; exit 1; }
     tar -xzf '/backup/$archive' -C '$path'"
  echo "ok: ${archive} -> ${service}:${path}"
}

log "Verifying snapshot checksums"
for file in postgres.dump minio_data.tar.gz redis-dump.rdb SHA256SUMS; do
  [[ -f "$SRC/$file" ]] || fail "${file} missing from ${SRC}"
done
# Older snapshots also list env and Tailscale files; those are not restored,
# so only the data files have to be present.
(cd "$SRC" && sha256sum -c --ignore-missing SHA256SUMS)

[[ -f .env ]] || fail ".env not found in ${REPO_ROOT}; create this machine's own .env first (snapshots do not include one)"
set -a; source .env; set +a

[[ -z "$("${COMPOSE[@]}" ps -aq)" ]] \
  || fail "containers for this compose project already exist; remove them first (docker compose -f docker-compose.prod.yml down)"

log "Creating data containers and volumes (no start)"
"${COMPOSE[@]}" up --no-start --no-deps "${DATA_SERVICES[@]}"

log "Restoring MinIO volume"
restore_volume minio /data minio_data.tar.gz

# Redis has no volume; the image entrypoint chowns /data to redis on start.
log "Restoring Redis dump.rdb"
docker cp "$SRC/redis-dump.rdb" "$(container_id redis)":/data/dump.rdb
echo "ok: redis-dump.rdb -> redis:/data/dump.rdb"

log "Starting Postgres"
"${COMPOSE[@]}" start postgres
waited=0
until "${COMPOSE[@]}" exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; do
  (( waited++ < TIMEOUT_SECONDS )) || fail "timed out waiting for postgres"
  sleep 1
done
table_count="$("${COMPOSE[@]}" exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
  "select count(*) from information_schema.tables where table_schema = 'public'")"
[[ "$table_count" == "0" ]] || fail "postgres database ${POSTGRES_DB} already has tables; refusing to restore over it"

log "Restoring Postgres"
"${COMPOSE[@]}" exec -T postgres \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --exit-on-error < "$SRC/postgres.dump"
echo "ok: postgres.dump restored"

log "Starting Redis and MinIO"
"${COMPOSE[@]}" start redis minio

log "Data restored"
"${COMPOSE[@]}" ps
echo "Only the data containers were started. The backend, frontend and Tailscale"
echo "sidecars were not; start them yourself if this machine should run the app."
