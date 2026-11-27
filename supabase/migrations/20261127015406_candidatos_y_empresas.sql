-- Candidatos, empresas y la bienvenida (elección de rol).

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

create type public.availability as enum ('immediate', 'two_weeks', 'freelance_only', 'not_looking');
create type public.profile_visibility as enum ('companies_only', 'public', 'hidden');
create type public.company_stage as enum ('pre_seed', 'seed', 'series_a_plus', 'bootstrapped', 'established');
create type public.company_size as enum ('1-10', '11-50', '51-200', '201-1000', '1000+');
create type public.company_status as enum ('unclaimed', 'active', 'suspended');
create type public.member_role as enum ('owner', 'member');

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------

-- "Ana Pérez" → "ana-perez"
create function public.slugify(p_value text)
returns text
language sql
stable
set search_path = ''
as $$
  select left(
    trim(both '-' from regexp_replace(lower(extensions.unaccent(coalesce(p_value, ''))), '[^a-z0-9]+', '-', 'g')),
    60
  );
$$;

-- Slug con sufijo aleatorio: no se adivina ni choca ("ana-perez-7k2f").
create function public.random_slug(p_value text)
returns text
language sql
volatile
set search_path = ''
as $$
  select concat_ws('-', nullif(public.slugify(p_value), ''), substr(md5(gen_random_uuid()::text), 1, 6));
$$;

-- "https://www.acme.com/empleos" → "acme.com"
create function public.domain_from_url(p_url text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(regexp_replace(lower(coalesce(p_url, '')), '^https?://(www\.)?([^/:?#]+).*$', '\2'), lower(coalesce(p_url, '')));
$$;

-- Dominios de email gratuitos: nunca sirven para verificar una empresa.
create function public.is_free_email_domain(p_domain text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(p_domain) = any (array[
    'gmail.com', 'googlemail.com', 'outlook.com', 'outlook.es', 'outlook.com.ar', 'hotmail.com',
    'hotmail.es', 'hotmail.com.ar', 'live.com', 'live.com.ar', 'msn.com', 'yahoo.com', 'yahoo.es',
    'yahoo.com.ar', 'icloud.com', 'me.com', 'aol.com', 'proton.me', 'protonmail.com', 'gmx.com',
    'mail.com', 'yandex.com', 'zoho.com', 'fibertel.com.ar'
  ]);
$$;

-- ¿El email (confirmado) pertenece al dominio de la empresa o a un subdominio?
create function public.email_matches_domain(p_email text, p_domain text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_domain is not null
    and not public.is_free_email_domain(p_domain)
    and (
      lower(split_part(p_email, '@', 2)) = lower(p_domain)
      or lower(split_part(p_email, '@', 2)) like '%.' || lower(p_domain)
    );
$$;

-- ---------------------------------------------------------------------------
-- Candidatos
-- ---------------------------------------------------------------------------

create table public.candidates (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  slug extensions.citext not null unique,
  full_name text not null check (char_length(full_name) between 2 and 80),
  headline text not null default '' check (char_length(headline) <= 100),
  bio text not null default '' check (char_length(bio) <= 500),
  country text check (country ~ '^[A-Z]{2}$'),
  city text check (char_length(city) <= 80),
  languages text[] not null default '{}' check (cardinality(languages) <= 10),
  github_url text check (github_url ~ '^https://'),
  linkedin_url text check (linkedin_url ~ '^https://'),
  website_url text check (website_url ~ '^https://'),
  avatar_url text check (avatar_url ~ '^https://'),
  availability public.availability not null default 'immediate',
  visibility public.profile_visibility not null default 'companies_only',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger candidates_updated_at before update on public.candidates
  for each row execute function public.set_updated_at();

alter table public.candidates enable row level security;

revoke all on public.candidates from anon, authenticated;
grant select on public.candidates to anon, authenticated;
grant update (full_name, headline, bio, country, city, languages, github_url, linkedin_url,
              website_url, avatar_url, availability, visibility)
  on public.candidates to authenticated;

-- ---------------------------------------------------------------------------
-- Empresas y sus miembros
-- ---------------------------------------------------------------------------

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  slug extensions.citext not null unique,
  name text not null check (char_length(name) between 2 and 80),
  -- Clave para verificar y reclamar: una empresa por dominio.
  domain extensions.citext unique,
  website_url text check (website_url ~ '^https://'),
  logo_path text,
  description text not null default '' check (char_length(description) <= 2000),
  industry text check (char_length(industry) <= 60),
  size public.company_size,
  stage public.company_stage,
  country text check (country ~ '^[A-Z]{2}$'),
  city text check (char_length(city) <= 80),
  linkedin_url text check (linkedin_url ~ '^https://'),
  x_url text check (x_url ~ '^https://'),
  instagram_url text check (instagram_url ~ '^https://'),
  status public.company_status not null default 'active',
  verified_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger companies_updated_at before update on public.companies
  for each row execute function public.set_updated_at();

create table public.company_members (
  company_id uuid not null references public.companies (id) on delete cascade,
  -- Único: un reclutador pertenece a una sola empresa.
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  member_role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

alter table public.companies enable row level security;
alter table public.company_members enable row level security;

revoke all on public.companies from anon, authenticated;
grant select on public.companies to anon, authenticated;
-- status, verified_at, domain, slug y created_by solo los cambia el sistema.
grant update (name, website_url, logo_path, description, industry, size, stage, country, city,
              linkedin_url, x_url, instagram_url)
  on public.companies to authenticated;

revoke all on public.company_members from anon, authenticated;
grant select on public.company_members to authenticated;

-- Empresa del reclutador actual (o null).
create function public.my_company_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.company_id
  from public.company_members m
  where m.user_id = (select auth.uid())
    and public.auth_role() = 'recruiter';
$$;

revoke execute on function public.my_company_id() from public;
grant execute on function public.my_company_id() to anon, authenticated;

-- ¿El usuario actual puede ver el perfil de este candidato?
-- (Se amplía con bloqueos y postulaciones en migraciones posteriores.)
create function public.can_view_candidate(p_candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.candidates c
    where c.user_id = p_candidate_id
      and (
        c.user_id = (select auth.uid())
        or public.is_admin()
        or c.visibility = 'public'
        or (c.visibility = 'companies_only' and public.my_company_id() is not null)
      )
  );
$$;

revoke execute on function public.can_view_candidate(uuid) from public;
grant execute on function public.can_view_candidate(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Políticas
-- ---------------------------------------------------------------------------

create policy "candidates: según la visibilidad del perfil"
  on public.candidates for select
  to anon, authenticated
  using ((select public.can_view_candidate(user_id)));

create policy "candidates: cada uno edita el suyo"
  on public.candidates for update
  to authenticated
  using (user_id = (select auth.uid()) and (select public.auth_role()) = 'candidate')
  with check (user_id = (select auth.uid()));

create policy "companies: visibles salvo suspendidas"
  on public.companies for select
  to anon, authenticated
  using (status <> 'suspended' or id = (select public.my_company_id()) or (select public.is_admin()));

create policy "companies: la editan sus miembros"
  on public.companies for update
  to authenticated
  using (id = (select public.my_company_id()) and status = 'active')
  with check (id = (select public.my_company_id()));

create policy "company_members: los ven los de la misma empresa"
  on public.company_members for select
  to authenticated
  using (company_id = (select public.my_company_id()) or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Bienvenida: crea el perfil con su rol. Se llama una sola vez por cuenta.
-- Los errores usan códigos que la app traduce: not_authenticated, already_onboarded, company_exists.
-- ---------------------------------------------------------------------------

create function public.onboard_candidate(p_full_name text, p_headline text, p_locale public.app_locale)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_avatar text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'already_onboarded' using errcode = 'P0001';
  end if;

  select nullif(u.raw_user_meta_data ->> 'avatar_url', '') into v_avatar
  from auth.users u where u.id = v_uid;

  insert into public.profiles (id, role, locale) values (v_uid, 'candidate', p_locale);
  insert into public.candidates (user_id, slug, full_name, headline, avatar_url)
  values (
    v_uid,
    public.random_slug(p_full_name),
    trim(p_full_name),
    trim(coalesce(p_headline, '')),
    case when v_avatar ~ '^https://' then v_avatar end
  );
end;
$$;

create function public.create_company(p_company_name text, p_website_url text, p_locale public.app_locale)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_email_confirmed boolean;
  v_domain text := public.domain_from_url(p_website_url);
  v_company_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'already_onboarded' using errcode = 'P0001';
  end if;
  if v_domain is not null and exists (select 1 from public.companies where domain = v_domain) then
    raise exception 'company_exists' using errcode = 'P0001';
  end if;

  select u.email, u.email_confirmed_at is not null into v_email, v_email_confirmed
  from auth.users u where u.id = v_uid;

  insert into public.profiles (id, role, locale) values (v_uid, 'recruiter', p_locale);

  insert into public.companies (slug, name, domain, website_url, verified_at, created_by)
  values (
    public.random_slug(p_company_name),
    trim(p_company_name),
    v_domain,
    nullif(trim(p_website_url), ''),
    case when v_email_confirmed and public.email_matches_domain(v_email, v_domain) then now() end,
    v_uid
  )
  returning id into v_company_id;

  insert into public.company_members (company_id, user_id, member_role)
  values (v_company_id, v_uid, 'owner');

  perform public.write_audit_log('company.created', 'company', v_company_id::text,
    jsonb_build_object('verified', exists (select 1 from public.companies where id = v_company_id and verified_at is not null)));

  return v_company_id;
end;
$$;

revoke execute on function public.onboard_candidate(text, text, public.app_locale) from public, anon;
revoke execute on function public.create_company(text, text, public.app_locale) from public, anon;
grant execute on function public.onboard_candidate(text, text, public.app_locale) to authenticated;
grant execute on function public.create_company(text, text, public.app_locale) to authenticated;
