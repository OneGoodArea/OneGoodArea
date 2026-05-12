#!/usr/bin/env sh
set -eu

COMPOSE_FILE="${OGA_COMPOSE_FILE:-container-compose.yml}"
SEED_ROOT="${OGA_SEED_ROOT:-tests/seeds}"
SEED_PROFILE="${OGA_SEED_PROFILE:-baseline}"

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v podman-compose >/dev/null 2>&1; then
  COMPOSE="podman-compose"
else
  echo "Neither docker compose nor podman-compose is available" >&2
  exit 1
fi

apply_sql_dir() {
  dir="$1"
  if [ ! -d "$dir" ]; then
    return
  fi

  find "$dir" -type f -name '*.sql' | sort | while IFS= read -r file; do
    echo "Applying seed file: $file"
    $COMPOSE -f "$COMPOSE_FILE" exec -T postgres sh -lc 'psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:-oga_user}" -d "${POSTGRES_DB:-oga_local}"' < "$file"
  done
}

apply_sql_dir "$SEED_ROOT/framework"
apply_sql_dir "$SEED_ROOT/profiles/$SEED_PROFILE"

