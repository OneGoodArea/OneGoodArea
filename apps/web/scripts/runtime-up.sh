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

$COMPOSE -f "$COMPOSE_FILE" up -d --build
