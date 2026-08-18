#!/usr/bin/env bash
# Thin wrapper so Mac / Git Bash can run: ./scripts/dev-up.sh [--reset]
set -euo pipefail
cd "$(dirname "$0")/.."
exec node ./scripts/dev-up.mjs "$@"
