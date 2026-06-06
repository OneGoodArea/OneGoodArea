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

$COMPOSE -f "$COMPOSE_FILE" -f "$COMPOSE_OVERRIDE_FILE" --profile minimal --profile full up -d --build
