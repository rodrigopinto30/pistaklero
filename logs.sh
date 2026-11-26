#!/usr/bin/env bash
# Muestra los logs de la app en vivo (Ctrl+C para salir).
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/docker/env.sh"
docker compose logs -f web
