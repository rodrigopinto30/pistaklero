# Variables compartidas por start.sh, stop.sh y run.sh. No se ejecuta solo: se carga con `source`.

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: Docker no está instalado." >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "Error: no puedo hablar con Docker. ¿Está corriendo y tu usuario está en el grupo docker?" >&2
  exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST_UID="$(id -u)"
HOST_GID="$(id -g)"
DOCKER_GID="$(stat -c '%g' /var/run/docker.sock)"
export PROJECT_DIR HOST_UID HOST_GID DOCKER_GID

cd "$PROJECT_DIR"

# Sin terminal interactiva (CI, scripts), docker compose run necesita -T.
TTY_FLAG=""
[ -t 0 ] && [ -t 1 ] || TTY_FLAG="-T"

tools() {
  docker compose run --rm $TTY_FLAG tools "$@"
}
