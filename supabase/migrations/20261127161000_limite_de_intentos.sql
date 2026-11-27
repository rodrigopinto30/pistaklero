-- Límite de intentos fallidos al ingresar, al confirmar el email y al cambiar la contraseña
-- (OWASP ASVS V6.3: frenar la fuerza bruta y el relleno de credenciales).
-- Supabase Auth ya limita por IP, pero los pedidos salen del servidor de la app: para Auth, todas
-- las personas comparten la misma IP. Por eso la app lleva su propia cuenta por email y por IP.
-- Las claves llegan ya hasheadas (sha256): acá no se guardan emails ni IPs.

create table public.auth_throttle (
  key text primary key check (key ~ '^(email|ip):[0-9a-f]{64}$'),
  failures int not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

-- Sin políticas: solo el servidor (clave secreta) la usa, a través de las funciones de abajo.
alter table public.auth_throttle enable row level security;
revoke all on public.auth_throttle from anon, authenticated;

-- Segundos que faltan para poder intentar de nuevo con alguna de las claves (0 si no hay bloqueo).
create function public.auth_throttle_wait(p_keys text[])
returns int
language sql
stable
set search_path = ''
as $$
  select coalesce(max(ceil(extract(epoch from t.locked_until - now())))::int, 0)
  from public.auth_throttle t
  where t.key = any (p_keys) and t.locked_until > now();
$$;

-- Suma un intento fallido. Al llegar a p_max dentro de la ventana, bloquea por p_lock.
create function public.auth_throttle_fail(p_key text, p_max int, p_window interval, p_lock interval)
returns void
language plpgsql
set search_path = ''
as $$
begin
  -- Limpieza al pasar: lo viejo ya no cuenta.
  delete from public.auth_throttle where updated_at < now() - interval '1 day';

  insert into public.auth_throttle as t (key, failures)
  values (p_key, 1)
  on conflict (key) do update set
    failures = case when t.window_started_at < now() - p_window then 1 else t.failures + 1 end,
    window_started_at = case when t.window_started_at < now() - p_window then now() else t.window_started_at end,
    updated_at = now();

  update public.auth_throttle
  set locked_until = now() + p_lock, failures = 0, window_started_at = now()
  where key = p_key and failures >= p_max;
end;
$$;

-- Un ingreso correcto borra la cuenta de esa clave.
create function public.auth_throttle_reset(p_key text)
returns void
language sql
set search_path = ''
as $$
  delete from public.auth_throttle where key = p_key;
$$;

revoke execute on function public.auth_throttle_wait(text[]) from public, anon, authenticated;
revoke execute on function public.auth_throttle_fail(text, int, interval, interval) from public, anon, authenticated;
revoke execute on function public.auth_throttle_reset(text) from public, anon, authenticated;
grant execute on function public.auth_throttle_wait(text[]) to service_role;
grant execute on function public.auth_throttle_fail(text, int, interval, interval) to service_role;
grant execute on function public.auth_throttle_reset(text) to service_role;
grant select, insert, update, delete on public.auth_throttle to service_role;
