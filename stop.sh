#!/usr/bin/env bash
# Baja todo el entorno de desarrollo. Los datos de la base local se conservan.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/docker/env.sh"

echo "▸ Bajando la app…"
docker compose down

echo "▸ Bajando Supabase…"
tools pnpm exec supabase stop

echo "✔ Todo abajo"
