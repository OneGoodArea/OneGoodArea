#!/usr/bin/env sh
set -eu

COMPOSE_FILE="${OGA_COMPOSE_FILE:-compose/compose.yml}"
COMPOSE_OVERRIDE_FILE="${OGA_COMPOSE_OVERRIDE_FILE:-compose/compose.override.yml}"

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif podman compose version >/dev/null 2>&1; then
  COMPOSE="podman compose"
else
  echo "Neither docker compose nor podman compose is available" >&2
  exit 1
fi

$COMPOSE -f "$COMPOSE_FILE" -f "$COMPOSE_OVERRIDE_FILE" exec -T postgres sh -lc 'psql -U "${POSTGRES_USER:-oga_user}" -d "${POSTGRES_DB:-oga_local}" -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"'
$COMPOSE -f "$COMPOSE_FILE" -f "$COMPOSE_OVERRIDE_FILE" exec -T postgres sh -lc 'psql -U "${POSTGRES_USER:-oga_user}" -d "${POSTGRES_DB:-oga_local}"' < apps/web/tests/db/bootstrap/001-bootstrap.sql

if [ "${OGA_SKIP_SEEDS:-false}" = "true" ]; then
  echo "Skipping seed application (OGA_SKIP_SEEDS=true)"
else
  ./apps/web/scripts/runtime-seed.sh
fi
