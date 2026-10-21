#!/usr/bin/env bash
# Restores a backup made by scripts/backup.sh, replacing the database and the stored files,
# then applies any newer migrations. The web app is stopped meanwhile and restarted only if
# it was running. Used by `make restore` locally and on the server.
#
#   scripts/restore.sh backups/db-<ts>.dump backups/files-<ts>.tar.gz
set -euo pipefail
usage="usage: restore.sh <db-*.dump> <files-*.tar.gz>"
db_dump="$(realpath "${1:?$usage}")"
files="$(realpath "${2:?$usage}")"
cd "$(dirname "$0")/.."

# On the server, the images of the running deploy (see scripts/entrypoint.sh).
IMAGE_TAG="${IMAGE_TAG:-$(cat .image-tag 2>/dev/null || echo latest)}"
export IMAGE_TAG

if [ -t 0 ]; then
  read -rp "Replace the database and stored files of the stack in $PWD? [y/N] " answer
  [ "$answer" = y ] || exit 1
fi

web_was_running="$(docker compose ps --status running --quiet web)"
docker compose stop web

echo "--- files"
docker compose stop storage
docker compose run --rm --no-deps -T --entrypoint sh storage \
  -c 'find /data -mindepth 1 -delete && tar xzf - -C /data' < "$files"
docker compose up --detach --wait db storage

echo "--- database"
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --clean --if-exists --no-owner --no-privileges --single-transaction --exit-on-error' < "$db_dump"

echo "--- migrations"
docker compose run --rm --no-deps init

if [ -n "$web_was_running" ]; then
  docker compose up --detach --wait --no-deps web
fi
echo "Restored $(basename "$db_dump") and $(basename "$files")"
