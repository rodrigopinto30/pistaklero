-- Equipo: invitaciones por email (token de un solo uso, guardado como hash) y gestión de miembros.

create function public.is_company_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.company_members m
    where m.user_id = (select auth.uid())
      and m.member_role = 'owner'
      and m.company_id = public.my_company_id()
  );
$$;

revoke execute on function public.is_company_owner() from public;
grant execute on function public.is_company_owner() to authenticated;

create table public.company_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  email extensions.citext not null check (email ~ '^[^@\s]+@[^@\s]+$'),
  -- SHA-256 del token que va en el link. El token en sí no se guarda nunca.
  token_hash text not null unique,
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Una invitación pendiente por email y empresa.
create unique index company_invitations_pending_idx on public.company_invitations (company_id, email) where accepted_at is null;

alter table public.company_invitations enable row level security;
revoke all on public.company_invitations from anon, authenticated;
grant select, delete on public.company_invitations to authenticated;

create policy "invitaciones: las ve el owner" on public.company_invitations
  for select to authenticated using (company_id = (select public.my_company_id()) and (select public.is_company_owner()));
create policy "invitaciones: las revoca el owner" on public.company_invitations
  for delete to authenticated using (company_id = (select public.my_company_id()) and (select public.is_company_owner()) and accepted_at is null);

-- Crea (o renueva) una invitación. El hash lo calcula la app a partir del token aleatorio.
create function public.create_invitation(p_email text, p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid := public.my_company_id();
  v_email text := lower(trim(p_email));
  v_id uuid;
begin
  if v_company_id is null or not public.is_company_owner() then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_token' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.company_members m join auth.users u on u.id = m.user_id
    where m.company_id = v_company_id and lower(u.email) = v_email
  ) then
    raise exception 'already_member' using errcode = 'P0001';
  end if;
  if (select count(*) from public.company_invitations where company_id = v_company_id and accepted_at is null) >= 20 then
    raise exception 'limit_reached' using errcode = 'P0001';
  end if;

  delete from public.company_invitations where company_id = v_company_id and email = v_email and accepted_at is null;
  insert into public.company_invitations (company_id, email, token_hash, invited_by)
  values (v_company_id, v_email, p_token_hash, (select auth.uid()))
  returning id into v_id;

  perform public.write_audit_log('team.invited', 'company', v_company_id::text, jsonb_build_object('email', v_email));
  return v_id;
end;
$$;

-- Acepta una invitación: la cuenta tiene que ser nueva (sin rol) y tener el email invitado.
create function public.accept_invitation(p_token text, p_locale public.app_locale)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_invitation public.company_invitations%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select * into v_invitation from public.company_invitations
  where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
    and accepted_at is null and expires_at > now()
  for update;
  if not found then
    raise exception 'invalid_invitation' using errcode = 'P0001';
  end if;

  select lower(u.email) into v_email from auth.users u where u.id = v_uid and u.email_confirmed_at is not null;
  if v_email is distinct from lower(v_invitation.email) then
    raise exception 'email_mismatch' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'already_onboarded' using errcode = 'P0001';
  end if;

  insert into public.profiles (id, role, locale) values (v_uid, 'recruiter', p_locale);
  insert into public.company_members (company_id, user_id, member_role) values (v_invitation.company_id, v_uid, 'member');
  update public.company_invitations set accepted_at = now() where id = v_invitation.id;

  perform public.write_audit_log('team.joined', 'company', v_invitation.company_id::text, '{}'::jsonb);
  return v_invitation.company_id;
end;
$$;

-- Miembros de mi empresa con su email (auth.users no es legible desde el cliente).
create function public.list_company_members()
returns table (user_id uuid, email text, member_role public.member_role, joined_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, u.email::text, m.member_role, m.created_at
  from public.company_members m
  join auth.users u on u.id = m.user_id
  where m.company_id = public.my_company_id()
  order by m.created_at;
$$;

-- El owner quita a un miembro o lo hace owner. Siempre queda al menos un owner.
create function public.update_member(p_user_id uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid := public.my_company_id();
begin
  if v_company_id is null or not public.is_company_owner() then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'cannot_change_self' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.company_members where company_id = v_company_id and user_id = p_user_id) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  if p_action = 'remove' then
    delete from public.company_members where company_id = v_company_id and user_id = p_user_id;
  elsif p_action = 'make_owner' then
    update public.company_members set member_role = 'owner' where company_id = v_company_id and user_id = p_user_id;
  else
    raise exception 'invalid_action' using errcode = 'P0001';
  end if;

  perform public.write_audit_log('team.' || p_action, 'company', v_company_id::text, jsonb_build_object('user_id', p_user_id));
end;
$$;

revoke execute on function public.create_invitation(text, text) from public, anon;
revoke execute on function public.accept_invitation(text, public.app_locale) from public, anon;
revoke execute on function public.list_company_members() from public, anon;
revoke execute on function public.update_member(uuid, text) from public, anon;
grant execute on function public.create_invitation(text, text) to authenticated;
grant execute on function public.accept_invitation(text, public.app_locale) to authenticated;
grant execute on function public.list_company_members() to authenticated;
grant execute on function public.update_member(uuid, text) to authenticated;
