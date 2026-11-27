-- Cola de emails (outbox): la app y las tareas programadas encolan; el servidor envía.
-- Nadie más que el servidor (clave secreta) puede leerla ni escribirla.

create type public.email_status as enum ('pending', 'sent', 'failed');

create table public.email_outbox (
  id bigint generated always as identity primary key,
  to_email text not null check (to_email ~ '^[^@\s]+@[^@\s]+$'),
  to_user_id uuid references auth.users (id) on delete set null,
  template text not null check (template ~ '^[a-z_]{1,40}$'),
  locale public.app_locale not null default 'es',
  payload jsonb not null default '{}'::jsonb,
  -- Evita mandar dos veces el mismo aviso (por ejemplo "warn14:<postulación>").
  dedupe_key text unique,
  status public.email_status not null default 'pending',
  attempts int not null default 0,
  last_error text,
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index email_outbox_pending_idx on public.email_outbox (next_attempt_at) where status = 'pending';

alter table public.email_outbox enable row level security;
revoke all on public.email_outbox from anon, authenticated;

-- Encola desde otras funciones (security definer). Ignora duplicados por dedupe_key.
create function public.enqueue_email(
  p_to_email text,
  p_to_user_id uuid,
  p_template text,
  p_locale public.app_locale,
  p_payload jsonb,
  p_dedupe_key text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.email_outbox (to_email, to_user_id, template, locale, payload, dedupe_key)
  values (p_to_email, p_to_user_id, p_template, p_locale, coalesce(p_payload, '{}'::jsonb), p_dedupe_key)
  on conflict (dedupe_key) do nothing;
$$;

-- Toma un lote para enviar. SKIP LOCKED: dos envíos en paralelo nunca toman el mismo email.
-- Si el envío se corta a mitad de camino, el email vuelve a quedar disponible en 10 minutos.
create function public.claim_email_batch(p_limit int)
returns setof public.email_outbox
language sql
security definer
set search_path = ''
as $$
  update public.email_outbox o
  set attempts = o.attempts + 1,
      next_attempt_at = now() + interval '10 minutes'
  where o.id in (
    select id from public.email_outbox
    where status = 'pending' and next_attempt_at <= now()
    order by id
    limit least(greatest(p_limit, 1), 100)
    for update skip locked
  )
  returning o.*;
$$;

revoke execute on function public.enqueue_email(text, uuid, text, public.app_locale, jsonb, text) from public, anon, authenticated;
revoke execute on function public.claim_email_batch(int) from public, anon, authenticated;
grant execute on function public.enqueue_email(text, uuid, text, public.app_locale, jsonb, text) to service_role;
grant execute on function public.claim_email_batch(int) to service_role;
