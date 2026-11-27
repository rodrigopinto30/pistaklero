#!/usr/bin/env bash
# Corre los tests de punta a punta (Playwright + axe) contra el entorno levantado con ./start.sh.
# Ejemplos:
#   ./e2e.sh                     # todos
#   ./e2e.sh e2e/a11y.spec.ts    # un archivo
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/docker/env.sh"

if ! curl -s -o /dev/null http://127.0.0.1:3000; then
  echo "La app no responde en http://127.0.0.1:3000: corré ./start.sh primero." >&2
  exit 1
fi

docker compose run --rm $TTY_FLAG e2e node_modules/.bin/playwright test "$@"
