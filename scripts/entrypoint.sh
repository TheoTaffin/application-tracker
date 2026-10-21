#!/usr/bin/env bash
# Runs the stack on a server: each deploy stage is its own command, so the CD calls them one
# step at a time and each one shows up (and fails) on its own in its logs. The CD uploads
# this file with compose.yaml on every deploy; .env and backups/ stay on the server.
#
#   scripts/entrypoint.sh deploy <tag> [user]  every stage below in order, for a manual deploy
#   scripts/entrypoint.sh pull <tag> [user]    pull the images built for <tag> (a commit SHA);
#                                              with [user], log in to GHCR with a token on stdin
#   scripts/entrypoint.sh backup               dump the database and files, keep the newest few
#   scripts/entrypoint.sh migrate              start db + storage, run migrations, bucket setup
#   scripts/entrypoint.sh up                   (re)start the web app, wait until it is healthy
#   scripts/entrypoint.sh health               call /api/health through the published port
#   scripts/entrypoint.sh prune                remove images unused for a week (keeps rollbacks)
#   scripts/entrypoint.sh logs                 service status and recent logs, for failed deploys
#   scripts/entrypoint.sh compose <args>       any docker compose command, on the deployed tag
set -euo pipefail
cd "$(dirname "$0")/.."

KEEP_BACKUPS=10
TAG_FILE=.image-tag # tag of the running deploy, written once its images are pulled

compose() { IMAGE_TAG="$(cat "$TAG_FILE" 2>/dev/null || echo latest)" docker compose "$@"; }

case "${1:-}" in
  deploy)
    tag="${2:?usage: entrypoint.sh deploy <tag> [user]}"
    for stage in pull backup migrate up health prune; do
      echo "--- $stage"
      args=()
      [ "$stage" = pull ] && args=("$tag" "${3:-}")
      scripts/entrypoint.sh "$stage" "${args[@]}" || {
        echo "Deploy failed at: $stage (details: scripts/entrypoint.sh logs)" >&2
        exit 1
      }
    done
    ;;
  pull)
    tag="${2:?usage: entrypoint.sh pull <tag> [user]}"
    if [ -n "${3:-}" ]; then
      # Throwaway Docker config: the token (valid for the CD job only) never stays on disk.
      DOCKER_CONFIG="$(mktemp -d)"
      export DOCKER_CONFIG
      trap 'rm -rf "$DOCKER_CONFIG"' EXIT
      docker login ghcr.io --username "$3" --password-stdin
    fi
    IMAGE_TAG="$tag" docker compose --progress plain pull
    echo "$tag" > "$TAG_FILE"
    echo "Pulled images for $tag"
    ;;
  backup)
    if [ -z "$(compose ps --status running --quiet db)" ]; then
      echo "Database is not running (first deploy?), nothing to back up"
      exit 0
    fi
    scripts/backup.sh
    for pattern in 'db-*.dump' 'files-*.tar.gz'; do
      # shellcheck disable=SC2012,SC2086 # our own timestamped names; the pattern is meant to glob
      ls -1t backups/$pattern | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm -v --
    done
    ;;
  migrate)
    compose up --detach --wait db storage
    compose run --rm --no-deps init
    ;;
  up)
    # init already ran in `migrate`, so it is not started again.
    compose up --detach --wait --wait-timeout 180 --no-deps --remove-orphans web
    ;;
  health)
    url="http://$(compose port web 3000)/api/health"
    for _ in $(seq 10); do
      if curl --fail --silent --show-error "$url"; then
        echo
        exit 0
      fi
      sleep 3
    done
    echo "Health check failed: $url" >&2
    exit 1
    ;;
  prune)
    docker image prune --all --force --filter until=168h
    ;;
  logs)
    compose ps --all
    compose logs --tail 100
    ;;
  compose)
    shift
    compose "$@"
    ;;
  *)
    # Usage: the comment block at the top of this file.
    sed -n '2,/^set /p' "$0" | sed '$d' >&2
    exit 1
    ;;
esac
