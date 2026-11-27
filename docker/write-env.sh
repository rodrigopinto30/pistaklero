# Escribe en .env.local las variables de Supabase local. Se carga con `source` desde start.sh.
#
# Solo reemplaza el bloque marcado: lo que agregues fuera de él (tus claves de Resend,
# Anthropic, OAuth…) se conserva entre arranques.

write_supabase_env() {
  local env_file="$PROJECT_DIR/.env.local"
  local begin="# >>> supabase local (generado por start.sh, no editar)"
  local end="# <<< supabase local"
  local status
  status="$(tools pnpm exec supabase status -o env 2>/dev/null)"

  get() { printf '%s\n' "$status" | sed -n "s/^$1=\"\{0,1\}\([^\"]*\)\"\{0,1\}$/\1/p"; }

  local api_url publishable_key secret_key mailpit_url outbox_secret
  api_url="$(get API_URL)"
  mailpit_url="$(get MAILPIT_URL)"
  # Secreto local para la ruta interna que vacía la cola de emails.
  outbox_secret="$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  publishable_key="$(get PUBLISHABLE_KEY)"
  secret_key="$(get SECRET_KEY)"

  if [ -z "$api_url" ] || [ -z "$publishable_key" ] || [ -z "$secret_key" ]; then
    echo "Error: no pude leer las claves de Supabase local (supabase status)." >&2
    return 1
  fi

  local kept=""
  if [ -f "$env_file" ]; then
    kept="$(awk -v b="$begin" -v e="$end" '$0==b{skip=1;next} $0==e{skip=0;next} !skip' "$env_file")"
  fi

  {
    [ -n "$kept" ] && printf '%s\n\n' "$kept"
    printf '%s\n' "$begin"
    printf 'NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000\n'
    printf 'NEXT_PUBLIC_SUPABASE_URL=%s\n' "$api_url"
    printf 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=%s\n' "$publishable_key"
    printf 'SUPABASE_SECRET_KEY=%s\n' "$secret_key"
    printf 'MAILPIT_URL=%s\n' "$mailpit_url"
    printf 'OUTBOX_SECRET=%s\n' "$outbox_secret"
    printf '%s\n' "$end"
  } > "$env_file.tmp"
  mv "$env_file.tmp" "$env_file"
  chmod 600 "$env_file"
}
