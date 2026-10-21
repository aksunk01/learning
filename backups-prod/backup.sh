#!/usr/bin/env bash
# Snapshot the production stack's container data (Postgres, MinIO, Redis) into
# backups-prod/<timestamp>/, so it can be restored on another machine with
# restore.sh. This is a data backup, not a server migration: it deliberately
# leaves out .env and the Tailscale sidecar state, because restoring those on a
# second machine makes it claim the same tailnet hostnames as this one.
set -euo pipefail

BACKUP_ROOT="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"
REPO_ROOT="$(cd "$BACKUP_ROOT/.." && pwd)"
cd "$REPO_ROOT"

COMPOSE=(docker compose -f docker-compose.prod.yml)
DEST="$BACKUP_ROOT/$(date +%Y%m%d-%H%M%S)"

log() { printf '\n==> %s\n' "$*"; }
fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

[[ -f .env ]] || fail ".env not found in ${REPO_ROOT}"
set -a; source .env; set +a

container_id() { "${COMPOSE[@]}" ps -aq "$1"; }

# Tars every volume mounted at $2 in service $1's container, read-only.
archive_volume() {
  local service="$1" path="$2" out="$3" cid
  cid="$(container_id "$service")"
  [[ -n "$cid" ]] || fail "no container for service ${service}"
  docker run --rm --volumes-from "$cid":ro -v "$DEST":/backup alpine \
    sh -c "tar -czf /backup/${out} -C ${path} . && chown $(id -u):$(id -g) /backup/${out}"
  echo "ok: ${out} ($(du -h "$DEST/$out" | cut -f1))"
}

mkdir -p "$DEST"
chmod 700 "$DEST"

log "Postgres (pg_dump custom format)"
"${COMPOSE[@]}" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$DEST/postgres.dump"
echo "ok: postgres.dump ($(du -h "$DEST/postgres.dump" | cut -f1))"

# Pausing freezes MinIO's writes so the tar is a consistent snapshot.
log "MinIO data volume"
minio_cid="$(container_id minio)"
docker pause "$minio_cid" >/dev/null
trap 'docker unpause "$minio_cid" >/dev/null 2>&1 || true' EXIT
archive_volume minio /data minio_data.tar.gz
docker unpause "$minio_cid" >/dev/null
trap - EXIT

# Redis has no volume in docker-compose.prod.yml, so its data lives in the
# container's /data and is lost on recreate unless restored from this file.
log "Redis (SAVE + dump.rdb)"
"${COMPOSE[@]}" exec -T redis redis-cli SAVE >/dev/null
docker cp "$(container_id redis)":/data/dump.rdb "$DEST/redis-dump.rdb"
echo "ok: redis-dump.rdb ($("${COMPOSE[@]}" exec -T redis redis-cli DBSIZE) keys)"

log "Manifest"
{
  echo "created: $(date -Iseconds)"
  echo "host: $(hostname)"
  echo "git_commit: $(git rev-parse HEAD 2>/dev/null || echo unknown)"
  echo "alembic_revision: $("${COMPOSE[@]}" exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc 'select version_num from alembic_version' 2>/dev/null | tr '\n' ' ')"
  echo "images:"
  for service in postgres redis minio; do
    cid="$(container_id "$service")"
    echo "  ${service}: $(docker inspect -f '{{.Config.Image}} {{.Image}}' "$cid")"
  done
} > "$DEST/manifest.txt"
(cd "$DEST" && sha256sum postgres.dump minio_data.tar.gz redis-dump.rdb > SHA256SUMS)

log "Backup complete: ${DEST}"
ls -lh "$DEST"
