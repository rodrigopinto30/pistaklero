#!/usr/bin/env bash
# Corre todas las verificaciones y corta en el primer fallo. Usalo antes de cada merge.
#   ./check.sh          # todo, incluidos los tests de punta a punta
#   ./check.sh --fast   # sin build ni e2e
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

step() { printf '\n▸ %s\n' "$1"; }

step "Tipos";            ./run.sh pnpm typecheck
step "Lint";             ./run.sh pnpm lint
step "Tests unitarios";  ./run.sh pnpm test
step "Tests de la base"; ./run.sh pnpm db:test

if [ "${1:-}" != "--fast" ]; then
  step "Build";          ./run.sh pnpm build
  step "Tests de punta a punta"; ./e2e.sh
fi

printf '\n✔ Todo en verde\n'
