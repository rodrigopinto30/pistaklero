#!/usr/bin/env bash
# Corre todas las verificaciones y corta en el primer fallo. Usalo antes de cada merge.
#   ./check.sh          # todo, incluidos los tests de punta a punta
#   ./check.sh --fast   # sin build ni e2e
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

step() { printf '\n▸ %s\n' "$1"; }

restart_web() {
  (source docker/env.sh && docker compose up -d web >/dev/null && docker compose restart web >/dev/null)
  for _ in $(seq 1 60); do
    curl -s -o /dev/null --fail http://127.0.0.1:3000/es && return 0
    sleep 2
  done
  echo "La app no volvió a responder después del reinicio." >&2
  return 1
}

step "Tipos";            ./run.sh pnpm typecheck
step "Lint";             ./run.sh pnpm lint
step "Tests unitarios";  ./run.sh pnpm test
step "Tests de la base"; ./run.sh pnpm db:test

if [ "${1:-}" != "--fast" ]; then
  # Mientras compila, la app de desarrollo queda frenada: los dos juntos piden demasiada memoria.
  (source docker/env.sh && docker compose stop web >/dev/null)
  step "Build";          ./run.sh pnpm build || { (source docker/env.sh && docker compose start web >/dev/null); exit 1; }
  # El servidor de desarrollo acumula memoria con cada compilación: arrancarlo limpio hace la suite estable.
  step "Reinicio de la app"; restart_web
  step "Tests de punta a punta"; ./e2e.sh
fi

printf '\n✔ Todo en verde\n'
