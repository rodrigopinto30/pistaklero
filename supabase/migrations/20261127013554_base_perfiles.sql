-- Base: extensiones, perfiles, funciones auxiliares para RLS y registro de auditoría.
--
-- Convenciones (ver docs/base-de-datos.md):
--   * RLS activado en todas las tablas; nada se permite sin una política explícita.
--   * Los permisos de tabla se dan columna por columna cuando hay campos inmutables.
--   * Las funciones security definer llevan search_path vacío y nombres calificados.

create extension if not exists citext with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('candidate', 'recruiter', 'admin');
create type public.app_locale as enum ('es', 'en');

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Perfiles: una fila por cuenta, creada en la bienvenida. El rol no cambia nunca.
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  locale public.app_locale not null default 'es',
  email_notifications boolean not null default true,
  suspended_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Una fila por cuenta. El rol se elige en la bienvenida y es inmutable.';

alter table public.profiles enable row level security;

-- Nadie inserta directo (lo hacen las funciones de bienvenida) y solo se editan las preferencias.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (locale, email_notifications) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Funciones auxiliares para las políticas
-- ---------------------------------------------------------------------------

-- Rol de la cuenta actual. Null si no hay sesión, si no completó la bienvenida o si está suspendida.
create function public.auth_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
    and p.suspended_at is null;
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.auth_role() = 'admin', false);
$$;

revoke execute on function public.auth_role() from public;
revoke execute on function public.is_admin() from public;
grant execute on function public.auth_role() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

create policy "profiles: cada uno ve el suyo y el admin ve todos"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "profiles: cada uno edita sus preferencias"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()) and suspended_at is null)
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Registro de auditoría: solo se agregan filas, desde funciones del sistema.
-- ---------------------------------------------------------------------------

create table public.audit_log (
  id bigint generated always as identity primary key,
  -- Sin FK a propósito: el registro sobrevive al borrado de la cuenta.
  actor_id uuid,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_log is 'Acciones sensibles. Solo inserta el sistema; nadie modifica ni borra.';

alter table public.audit_log enable row level security;

revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

create policy "audit_log: solo lo ve el admin"
  on public.audit_log for select
  to authenticated
  using ((select public.is_admin()));

-- Para usar desde otras funciones security definer.
create function public.write_audit_log(
  p_action text,
  p_target_type text default null,
  p_target_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, action, target_type, target_id, metadata)
  values ((select auth.uid()), p_action, p_target_type, p_target_id, p_metadata);
$$;

revoke execute on function public.write_audit_log(text, text, text, jsonb) from public, anon, authenticated;
