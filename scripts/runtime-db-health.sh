#!/usr/bin/env sh
set -eu

curl --fail --silent --show-error http://localhost:55433/health >/dev/null
