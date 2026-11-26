#!/usr/bin/env bash
# Corre un comando dentro del contenedor de herramientas.
# Ejemplos:
#   ./run.sh pnpm add zod
#   ./run.sh pnpm lint
#   ./run.sh pnpm exec supabase migration new crear_perfiles
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/docker/env.sh"

if [ $# -eq 0 ]; then
  echo "Uso: ./run.sh <comando>   (ej: ./run.sh pnpm lint)" >&2
  exit 1
fi

tools "$@"
