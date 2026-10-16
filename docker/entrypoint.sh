#!/bin/sh
# Usage: entrypoint.sh web|worker
# `web` runs pending DB migrations first (idempotent), then starts the Next.js standalone server.
# `worker` starts after web is healthy (compose depends_on), so the schema is current.
set -eu

ROLE="${1:-web}"

case "$ROLE" in
  web)
    echo "[entrypoint] running database migrations"
    node dist/migrate.js
    echo "[entrypoint] starting web"
    exec node server.js
    ;;
  worker)
    echo "[entrypoint] starting worker"
    exec node dist/worker/index.js
    ;;
  *)
    echo "unknown role: $ROLE" >&2
    exit 1
    ;;
esac
