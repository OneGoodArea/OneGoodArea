#!/usr/bin/env sh
set -eu

COMPOSE_FILE="${OGA_COMPOSE_FILE:-container-compose.yml}"

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v podman-compose >/dev/null 2>&1; then
  COMPOSE="podman-compose"
else
  echo "Neither docker compose nor podman-compose is available" >&2
  exit 1
fi

$COMPOSE -f "$COMPOSE_FILE" exec -T database sh -lc 'psql -U "${POSTGRES_USER:-oga_user}" -d "${POSTGRES_DB:-oga_local}" -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"'
$COMPOSE -f "$COMPOSE_FILE" exec -T database sh -lc 'psql -U "${POSTGRES_USER:-oga_user}" -d "${POSTGRES_DB:-oga_local}"' < tests/db/bootstrap/001-bootstrap.sql

if [ "${OGA_SKIP_SEEDS:-false}" = "true" ]; then
  echo "Skipping seed application (OGA_SKIP_SEEDS=true)"
else
  ./scripts/runtime-seed.sh
fi
