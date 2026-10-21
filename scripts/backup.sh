#!/usr/bin/env bash
# Dumps the database and archives the stored files into ./backups (the stack must be up).
# Used by `make backup` locally and by scripts/deploy.sh on the server.
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p backups
ts=$(date +%Y%m%d-%H%M%S)
db="backups/db-$ts.dump"
files="backups/files-$ts.tar.gz"

# Written under a temporary name and renamed once both succeed, so a failed run never
# leaves a truncated file that looks like a valid backup.
trap 'rm -f "$db.partial" "$files.partial"' EXIT
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$db.partial"
docker compose exec -T storage tar czf - -C /data . > "$files.partial"
mv "$db.partial" "$db"
mv "$files.partial" "$files"
echo "Backup written to $db and $files"
