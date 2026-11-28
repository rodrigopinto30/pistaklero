-- Mensajes entre personas (candidatas, empresas y entre ambas), como en LinkedIn. Solo texto.
--
-- Reglas (anti-spam y anti-estafa):
--   * Conversaciones de a dos. El primer mensaje de alguien desconocido llega como "solicitud": quien
--     lo recibe lo acepta (o responde) o lo ignora (quien escribió no se entera). Hasta que la acepte,
--     quien escribió no puede mandar otro mensaje.
--   * Si hay una postulación de por medio (la candidata se postuló a una oferta de esa empresa),
--     la conversación arranca aceptada.
--   * Límites: 20 conversaciones nuevas por día y 60 mensajes por hora por persona.
--   * Bloquear corta la conversación en los dos sentidos; cualquier mensaje se puede denunciar.
--   * Nadie lee las tablas directo: todo pasa por funciones que validan que seas parte.

create type public.conversation_state as enum ('accepted', 'request', 'ignored');

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  -- Un par de personas tiene una sola conversación (los ids ordenados).
  pair_key text not null unique,
  started_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  state public.conversation_state not null default 'accepted',
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create index conversation_members_user_idx on public.conversation_members (user_id, state);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(body) between 1 and 2000),
  -- clock_timestamp: ordena bien también dos mensajes en la misma transacción.
  created_at timestamptz not null default clock_timestamp()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at desc);
create index messages_sender_idx on public.messages (sender_id, created_at desc);

create table public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create type public.message_report_reason as enum ('spam', 'scam', 'offensive', 'other');

create table public.message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason public.message_report_reason not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (message_id, reporter_id)
);

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.user_blocks enable row level security;
alter table public.message_reports enable row level security;
revoke all on public.conversations, public.conversation_members, public.messages, public.user_blocks, public.message_reports from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Ayudas
-- ---------------------------------------------------------------------------

/** ¿Hay un bloqueo entre estas dos personas (en cualquier sentido)? */
create function public.users_blocked(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = p_a and blocked_id = p_b) or (blocker_id = p_b and blocked_id = p_a)
  );
$$;

/** ¿Una postulación une a estas dos personas? (una se postuló a una oferta de la empresa de la otra). */
create function public.users_share_application(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.applications a
    join public.jobs j on j.id = a.job_id
    join public.company_members m on m.company_id = j.company_id
    where (a.candidate_id = p_a and m.user_id = p_b) or (a.candidate_id = p_b and m.user_id = p_a)
  );
$$;

/**
 * ¿Puede `p_sender` escribirle por primera vez a `p_recipient`? A una candidata se le escribe si su
 * perfil se puede ver (público, o "solo empresas" si escribe una empresa) o si se postuló a esa
 * empresa; a una empresa, siempre. Nunca con bloqueos, cuentas suspendidas o sin perfil.
 */
create function public.can_message(p_sender uuid, p_recipient uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sender public.profiles%rowtype;
  v_recipient public.profiles%rowtype;
  v_visibility public.profile_visibility;
begin
  if p_sender is null or p_recipient is null or p_sender = p_recipient then
    return false;
  end if;
  select * into v_sender from public.profiles where id = p_sender;
  select * into v_recipient from public.profiles where id = p_recipient;
  if v_sender.id is null or v_recipient.id is null or v_sender.suspended_at is not null or v_recipient.suspended_at is not null then
    return false;
  end if;
  if public.users_blocked(p_sender, p_recipient) then
    return false;
  end if;
  if v_recipient.role = 'candidate' then
    select c.visibility into v_visibility from public.candidates c where c.user_id = p_recipient;
    return v_visibility = 'public'
      or (v_visibility = 'companies_only' and v_sender.role in ('recruiter', 'admin'))
      or public.users_share_application(p_sender, p_recipient);
  end if;
  return true;
end;
$$;

/** ¿Puedo escribirle a esta persona? (para mostrar o no el botón "Mensaje"). */
create function public.can_i_message(p_recipient uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_message((select auth.uid()), p_recipient);
$$;

/** El otro miembro de una conversación. */
create function public.conversation_other(p_conversation_id uuid, p_me uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select user_id from public.conversation_members where conversation_id = p_conversation_id and user_id <> p_me limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Escribir
-- ---------------------------------------------------------------------------

/** Mensaje en una conversación (valida límites, solicitud pendiente y bloqueos) y avisa por email. */
create function public.post_message(p_conversation_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_body text := btrim(coalesce(p_body, ''));
  v_mine public.conversation_members%rowtype;
  v_theirs public.conversation_members%rowtype;
  v_id uuid;
  v_email text;
  v_locale public.app_locale;
  v_wants_email boolean;
  v_sender_name text;
begin
  select * into v_mine from public.conversation_members where conversation_id = p_conversation_id and user_id = v_me for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  select * into v_theirs from public.conversation_members where conversation_id = p_conversation_id and user_id <> v_me;
  if char_length(v_body) not between 1 and 2000 then
    raise exception 'invalid_body' using errcode = 'P0001';
  end if;
  if public.users_blocked(v_me, v_theirs.user_id) or exists (select 1 from public.profiles where id = v_me and suspended_at is not null) then
    raise exception 'not_available' using errcode = 'P0001';
  end if;
  -- Mientras la otra persona no acepte la solicitud, se manda un solo mensaje: no se puede insistir.
  if v_theirs.state <> 'accepted' and exists (
    select 1 from public.messages where conversation_id = p_conversation_id and sender_id = v_me
  ) then
    raise exception 'request_pending' using errcode = 'P0001';
  end if;
  if (select count(*) from public.messages where sender_id = v_me and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  -- Responder una solicitud es aceptarla.
  if v_mine.state <> 'accepted' then
    update public.conversation_members set state = 'accepted' where conversation_id = p_conversation_id and user_id = v_me;
  end if;

  insert into public.messages (conversation_id, sender_id, body) values (p_conversation_id, v_me, v_body) returning id into v_id;
  update public.conversations set last_message_at = clock_timestamp() where id = p_conversation_id;
  update public.conversation_members set last_read_at = clock_timestamp() where conversation_id = p_conversation_id and user_id = v_me;

  -- Aviso por email, uno por conversación por día (si la persona los quiere).
  select u.email, p.locale, p.email_notifications into v_email, v_locale, v_wants_email
  from auth.users u join public.profiles p on p.id = u.id where u.id = v_theirs.user_id;
  select pe.full_name into v_sender_name from public.people pe where pe.user_id = v_me;
  if v_email is not null and v_wants_email then
    perform public.enqueue_email(
      v_email, v_theirs.user_id, 'new_message', v_locale,
      jsonb_build_object('senderName', coalesce(v_sender_name, ''), 'request', v_theirs.state = 'request'),
      'message:' || p_conversation_id || ':' || v_theirs.user_id || ':' || ((now() at time zone 'utc')::date)::text
    );
  end if;
  return v_id;
end;
$$;

/**
 * Escribirle a alguien: usa la conversación que ya tengan o arranca una (como solicitud, salvo que
 * una postulación los una). Devuelve la conversación.
 */
create function public.start_conversation(p_recipient uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_key text;
  v_id uuid;
begin
  if v_me is null or not public.can_message(v_me, p_recipient) then
    raise exception 'not_available' using errcode = 'P0001';
  end if;
  v_key := least(v_me::text, p_recipient::text) || ':' || greatest(v_me::text, p_recipient::text);
  select id into v_id from public.conversations where pair_key = v_key;

  if v_id is null then
    if (select count(*) from public.conversations where started_by = v_me and created_at > now() - interval '1 day') >= 20 then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
    insert into public.conversations (pair_key, started_by) values (v_key, v_me) returning id into v_id;
    insert into public.conversation_members (conversation_id, user_id, state) values
      (v_id, v_me, 'accepted'),
      (v_id, p_recipient, case when public.users_share_application(v_me, p_recipient) then 'accepted' else 'request' end::public.conversation_state);
  end if;

  perform public.post_message(v_id, p_body);
  return v_id;
end;
$$;

/** Aceptar o ignorar una solicitud (ignorarla la saca de la vista; quien escribió no se entera). */
create function public.answer_conversation_request(p_conversation_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversation_members
  set state = case when p_accept then 'accepted' else 'ignored' end::public.conversation_state
  where conversation_id = p_conversation_id and user_id = (select auth.uid()) and state <> 'accepted';
  if not found and not exists (
    select 1 from public.conversation_members where conversation_id = p_conversation_id and user_id = (select auth.uid())
  ) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
end;
$$;

create function public.mark_conversation_read(p_conversation_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.conversation_members set last_read_at = clock_timestamp()
  where conversation_id = p_conversation_id and user_id = (select auth.uid());
$$;

create function public.block_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null or p_user_id = (select auth.uid()) then
    raise exception 'invalid' using errcode = 'P0001';
  end if;
  insert into public.user_blocks (blocker_id, blocked_id) values ((select auth.uid()), p_user_id) on conflict do nothing;
end;
$$;

create function public.unblock_user(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.user_blocks where blocker_id = (select auth.uid()) and blocked_id = p_user_id;
$$;

create function public.report_message(p_message_id uuid, p_reason public.message_report_reason)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_message public.messages%rowtype;
begin
  select * into v_message from public.messages where id = p_message_id;
  if not found or v_message.sender_id = (select auth.uid()) or not exists (
    select 1 from public.conversation_members where conversation_id = v_message.conversation_id and user_id = (select auth.uid())
  ) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  insert into public.message_reports (message_id, reporter_id, reason) values (p_message_id, (select auth.uid()), p_reason)
  on conflict (message_id, reporter_id) do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- Leer
-- ---------------------------------------------------------------------------

/** La otra persona tal como se muestra: nombre, foto y una línea (titular o cargo y empresa). */
create function public.message_contact(p_user_id uuid)
returns table (user_id uuid, full_name text, avatar_path text, subtitle text, profile_slug text, company_slug text, role public.user_role)
language sql
stable
security definer
set search_path = ''
as $$
  select pr.id, coalesce(pe.full_name, ''), pe.avatar_path,
    case
      when pr.role = 'candidate' then c.headline
      when pr.role = 'recruiter' then concat_ws(' · ', m.job_title, co.name)
      else null
    end,
    case when pr.role = 'candidate' and public.candidate_card_visible(pr.id) then c.slug::text end,
    co.slug::text,
    pr.role
  from public.profiles pr
  left join public.people pe on pe.user_id = pr.id
  left join public.candidates c on c.user_id = pr.id
  left join public.company_members m on m.user_id = pr.id
  left join public.companies co on co.id = m.company_id
  where pr.id = p_user_id;
$$;

/** Mis conversaciones: 'inbox' (aceptadas) o 'requests' (solicitudes recibidas). */
create function public.my_conversations(p_box text default 'inbox')
returns table (
  id uuid, other_id uuid, other_name text, other_avatar text, other_subtitle text,
  last_body text, last_sender uuid, last_message_at timestamptz, unread integer, waiting boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select cv.id, other.user_id, contact.full_name, contact.avatar_path, contact.subtitle,
    left(last.body, 140), last.sender_id, cv.last_message_at,
    (select count(*)::int from public.messages msg
      where msg.conversation_id = cv.id and msg.sender_id <> (select auth.uid())
        and msg.created_at > coalesce(me.last_read_at, '-infinity'::timestamptz)),
    other.state <> 'accepted'
  from public.conversation_members me
  join public.conversations cv on cv.id = me.conversation_id
  join public.conversation_members other on other.conversation_id = cv.id and other.user_id <> me.user_id
  cross join lateral public.message_contact(other.user_id) contact
  left join lateral (
    select msg.body, msg.sender_id from public.messages msg where msg.conversation_id = cv.id order by msg.created_at desc limit 1
  ) last on true
  where me.user_id = (select auth.uid())
    and not public.users_blocked(me.user_id, other.user_id)
    and ((p_box = 'requests' and me.state = 'request') or (p_box <> 'requests' and me.state = 'accepted'))
  order by cv.last_message_at desc
  limit 100;
$$;

/** Una conversación: quién es la otra persona y en qué estado está cada lado. */
create function public.conversation_detail(p_conversation_id uuid)
returns table (
  id uuid, my_state public.conversation_state, their_state public.conversation_state, blocked_by_me boolean, blocked boolean,
  other_id uuid, other_name text, other_avatar text, other_subtitle text, other_profile_slug text, other_company_slug text
)
language sql
stable
security definer
set search_path = ''
as $$
  select me.conversation_id, me.state, other.state,
    exists (select 1 from public.user_blocks b where b.blocker_id = me.user_id and b.blocked_id = other.user_id),
    public.users_blocked(me.user_id, other.user_id),
    contact.user_id, contact.full_name, contact.avatar_path, contact.subtitle, contact.profile_slug, contact.company_slug
  from public.conversation_members me
  join public.conversation_members other on other.conversation_id = me.conversation_id and other.user_id <> me.user_id
  cross join lateral public.message_contact(other.user_id) contact
  where me.conversation_id = p_conversation_id and me.user_id = (select auth.uid()) and me.state <> 'ignored';
$$;

/** Los mensajes (los últimos `p_limit`, o los posteriores a `p_after` para ir trayendo los nuevos). */
create function public.conversation_messages(p_conversation_id uuid, p_after timestamptz default null, p_limit int default 100)
returns table (id uuid, sender_id uuid, body text, created_at timestamptz, mine boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select * from (
    select msg.id, msg.sender_id, msg.body, msg.created_at, msg.sender_id = (select auth.uid())
    from public.messages msg
    where msg.conversation_id = p_conversation_id
      and exists (
        select 1 from public.conversation_members me
        where me.conversation_id = p_conversation_id and me.user_id = (select auth.uid()) and me.state <> 'ignored'
      )
      and (p_after is null or msg.created_at > p_after)
    order by msg.created_at desc
    limit least(greatest(coalesce(p_limit, 100), 1), 200)
  ) recent
  order by created_at;
$$;

/** Para el ícono del encabezado: mensajes sin leer más solicitudes nuevas. */
create function public.unread_messages_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select (
    select count(*)::int from public.conversation_members me
    join public.messages msg on msg.conversation_id = me.conversation_id
    where me.user_id = (select auth.uid()) and me.state = 'accepted'
      and msg.sender_id <> me.user_id and msg.created_at > coalesce(me.last_read_at, '-infinity'::timestamptz)
  ) + (
    select count(*)::int from public.conversation_members me
    where me.user_id = (select auth.uid()) and me.state = 'request'
  );
$$;

/** ¿Ya hay una conversación con esta persona? (para "Mensaje" ir directo a ella). */
create function public.conversation_with(p_user_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select cv.id from public.conversations cv
  join public.conversation_members me on me.conversation_id = cv.id and me.user_id = (select auth.uid()) and me.state <> 'ignored'
  where cv.pair_key = least((select auth.uid())::text, p_user_id::text) || ':' || greatest((select auth.uid())::text, p_user_id::text);
$$;

-- Lo que puede llamar cada quien (las ayudas internas no se exponen).
revoke execute on function public.users_blocked(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.users_share_application(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.conversation_other(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.message_contact(uuid) from public, anon, authenticated;
revoke execute on function public.post_message(uuid, text) from public, anon;
revoke execute on function public.start_conversation(uuid, text) from public, anon;
revoke execute on function public.answer_conversation_request(uuid, boolean) from public, anon;
revoke execute on function public.mark_conversation_read(uuid) from public, anon;
revoke execute on function public.block_user(uuid) from public, anon;
revoke execute on function public.unblock_user(uuid) from public, anon;
revoke execute on function public.report_message(uuid, public.message_report_reason) from public, anon;
revoke execute on function public.my_conversations(text) from public, anon;
revoke execute on function public.conversation_detail(uuid) from public, anon;
revoke execute on function public.conversation_messages(uuid, timestamptz, int) from public, anon;
revoke execute on function public.unread_messages_count() from public, anon;
revoke execute on function public.conversation_with(uuid) from public, anon;
revoke execute on function public.can_message(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.can_i_message(uuid) from public, anon;
grant execute on function public.post_message(uuid, text) to authenticated;
grant execute on function public.start_conversation(uuid, text) to authenticated;
grant execute on function public.answer_conversation_request(uuid, boolean) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;
grant execute on function public.report_message(uuid, public.message_report_reason) to authenticated;
grant execute on function public.my_conversations(text) to authenticated;
grant execute on function public.conversation_detail(uuid) to authenticated;
grant execute on function public.conversation_messages(uuid, timestamptz, int) to authenticated;
grant execute on function public.unread_messages_count() to authenticated;
grant execute on function public.conversation_with(uuid) to authenticated;
grant execute on function public.can_i_message(uuid) to authenticated;
