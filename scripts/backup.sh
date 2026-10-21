#!/usr/bin/env bash
# Dumps the database and archives the stored files into ./backups (the stack must be up).
# Used by `make backup` locally and by scripts/deploy.sh on the server.
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p backups
ts=$(date +%Y%m%d-%H%M%S)
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "backups/db-$ts.dump"
docker compose exec -T storage tar czf - -C /data . > "backups/files-$ts.tar.gz"
echo "Backup written to backups/db-$ts.dump and backups/files-$ts.tar.gz"
