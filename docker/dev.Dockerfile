# Imagen de desarrollo: Node + pnpm. Nada de esto se instala en el sistema del host.
# Cliente de Docker (sin motor): la CLI de Supabase lo usa para manejar sus contenedores.
FROM docker:27.2.1-cli AS docker-cli

FROM node:24.22.3-trixie-slim

COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker

ENV COREPACK_HOME=/opt/corepack \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NEXT_TELEMETRY_DISABLED=1 \
    HOME=/home/dev \
    XDG_CONFIG_HOME=/opt/xdg-config

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable pnpm \
 && corepack prepare pnpm@10.34.9 --activate \
 && mkdir -p /home/dev /pnpm-store /opt/xdg-config/pnpm \
 && echo "store-dir=/pnpm-store" > /opt/xdg-config/pnpm/rc \
 && chmod 1777 /opt/corepack /home/dev /pnpm-store /opt/xdg-config
