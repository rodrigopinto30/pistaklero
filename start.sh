#!/usr/bin/env bash
# Levanta todo el entorno de desarrollo: Supabase + app Next.js.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/docker/env.sh"

echo "▸ Preparando la imagen de desarrollo…"
docker compose build --quiet web

echo "▸ Instalando dependencias…"
tools pnpm install --frozen-lockfile

echo "▸ Levantando Supabase (la primera vez descarga imágenes y tarda unos minutos)…"
tools pnpm exec supabase start

echo "▸ Levantando la app…"
docker compose up -d web

cat <<'EOF'

✔ Todo arriba
  App               http://127.0.0.1:3000
  Supabase API      http://127.0.0.1:54321
  Supabase Studio   http://127.0.0.1:54323
  Emails (Mailpit)  http://127.0.0.1:54324

  Logs de la app:   ./logs.sh
  Bajar todo:       ./stop.sh
EOF
