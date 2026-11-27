-- Ofertas de empleo: nativas (las publica la empresa) e importadas (las carga el admin).

create type public.job_source as enum ('native', 'imported');
create type public.job_status as enum ('draft', 'published', 'closed', 'hidden');
create type public.seniority as enum ('trainee', 'junior', 'semi_senior', 'senior', 'lead');
create type public.employment_type as enum ('full_time', 'part_time', 'contract', 'internship', 'freelance');
create type public.work_mode as enum ('remote', 'hybrid', 'onsite');
create type public.question_type as enum ('short_text', 'single_choice');
create type public.import_provider as enum ('manual', 'greenhouse', 'lever', 'ashby', 'workable');

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  source public.job_source not null default 'native',
  status public.job_status not null default 'draft',
  -- Lo completa el trigger jobs_before_write a partir del título.
  slug extensions.citext not null unique default '',
  title text not null check (char_length(title) between 3 and 100),
  description text not null default '' check (char_length(description) <= 8000),
  summary text not null default '' check (char_length(summary) <= 600),
  language public.app_locale not null,
  seniority public.seniority not null,
  employment_type public.employment_type not null,
  work_mode public.work_mode not null,
  country text check (country ~ '^[A-Z]{2}$'),
  city text check (char_length(city) <= 80),
  salary_min numeric(12, 2),
  salary_max numeric(12, 2),
  salary_currency public.currency,
  salary_period public.salary_period,
  salary_basis public.salary_basis,
  valid_through timestamptz not null,
  published_at timestamptz,
  closed_at timestamptz,
  external_url text check (external_url ~ '^https://'),
  external_provider public.import_provider,
  external_id text,
  search_vector tsvector,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (external_provider, external_id),
  -- Presencial o híbrida: hay que decir dónde.
  constraint jobs_location check (work_mode = 'remote' or country is not null),
  -- El salario es todo o nada.
  constraint jobs_salary_complete check (
    (salary_min is null) = (salary_max is null)
    and (salary_min is null) = (salary_currency is null)
    and (salary_min is null) = (salary_period is null)
    and (salary_min is null) = (salary_basis is null)
  ),
  -- Rangos coherentes: sin "de 1 a 1.000.000".
  constraint jobs_salary_range check (salary_min is null or (salary_min > 0 and salary_min <= salary_max and salary_max <= salary_min * 3)),
  -- Transparencia salarial obligatoria en las ofertas nativas.
  constraint jobs_native_rules check (source <> 'native' or (salary_min is not null and external_url is null)),
  constraint jobs_imported_rules check (source <> 'imported' or external_url is not null),
  constraint jobs_valid_through check (valid_through <= created_at + interval '90 days')
);

create index jobs_search_idx on public.jobs using gin (search_vector);
create index jobs_listing_idx on public.jobs (status, published_at desc);
create index jobs_company_idx on public.jobs (company_id);

create trigger jobs_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

create table public.job_skills (
  job_id uuid not null references public.jobs (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  primary key (job_id, skill_id)
);

create trigger job_skills_limit before insert on public.job_skills
  for each row execute function public.enforce_row_limit('10', 'job_id');

create table public.job_questions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  -- Solo las posiciones 1 y 2: la base misma impide una tercera pregunta.
  position smallint not null check (position in (1, 2)),
  type public.question_type not null,
  prompt text not null check (char_length(prompt) between 3 and 200),
  options text[] check (
    (type = 'single_choice' and cardinality(options) between 2 and 5)
    or (type = 'short_text' and options is null)
  ),
  required boolean not null default true,
  unique (job_id, position)
);

-- ---------------------------------------------------------------------------
-- Reglas de publicación
-- ---------------------------------------------------------------------------

create function public.jobs_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.slug := public.random_slug(new.title);
    new.created_by := coalesce(new.created_by, (select auth.uid()));
  end if;

  -- Ocultar (moderación) es solo del admin, y una oferta oculta solo la libera el admin.
  if (new.status = 'hidden' or (tg_op = 'UPDATE' and old.status = 'hidden'))
     and new.status is distinct from (case when tg_op = 'UPDATE' then old.status end)
     and not public.is_admin()
     and (select auth.uid()) is not null then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    if new.valid_through <= now() then
      raise exception 'expired' using errcode = 'P0001';
    end if;
    -- Una empresa sin verificar puede tener hasta 2 ofertas nativas activas.
    if new.source = 'native'
       and (select verified_at from public.companies where id = new.company_id) is null
       and (select count(*) from public.jobs
            where company_id = new.company_id and source = 'native' and status = 'published'
              and valid_through > now() and id <> new.id) >= 2 then
      raise exception 'unverified_limit' using errcode = 'P0001';
    end if;
    new.published_at := coalesce(new.published_at, now());
    new.closed_at := null;
  end if;

  if new.status = 'closed' and (tg_op = 'INSERT' or old.status <> 'closed') then
    new.closed_at := now();
  end if;

  return new;
end;
$$;

create trigger jobs_before_write before insert or update on public.jobs
  for each row execute function public.jobs_before_write();

-- ---------------------------------------------------------------------------
-- Búsqueda de texto: título (A), empresa y tecnologías (B), descripción (C),
-- con el diccionario del idioma de la oferta y sin acentos.
-- ---------------------------------------------------------------------------

create function public.refresh_job_search_vector(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_config regconfig;
begin
  select case j.language when 'en' then 'pg_catalog.english'::regconfig else 'pg_catalog.spanish'::regconfig end
  into v_config from public.jobs j where j.id = p_job_id;

  update public.jobs j
  set search_vector =
    setweight(to_tsvector(v_config, extensions.unaccent(j.title)), 'A')
    || setweight(to_tsvector(v_config, extensions.unaccent(coalesce(c.name, ''))), 'B')
    || setweight(to_tsvector(v_config, extensions.unaccent(coalesce((
         select string_agg(s.name_es || ' ' || s.name_en, ' ')
         from public.job_skills js join public.skills s on s.id = js.skill_id
         where js.job_id = j.id), ''))), 'B')
    || setweight(to_tsvector(v_config, extensions.unaccent(j.description || ' ' || j.summary)), 'C')
  from public.companies c
  where j.id = p_job_id and c.id = j.company_id;
end;
$$;

create function public.jobs_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.title is distinct from old.title or new.description is distinct from old.description
     or new.summary is distinct from old.summary or new.language is distinct from old.language then
    perform public.refresh_job_search_vector(new.id);
  end if;
  return null;
end;
$$;

create trigger jobs_after_write after insert or update on public.jobs
  for each row execute function public.jobs_after_write();

create function public.job_skills_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_job_search_vector(coalesce(new.job_id, old.job_id));
  return null;
end;
$$;

create trigger job_skills_after_write after insert or delete on public.job_skills
  for each row execute function public.job_skills_after_write();

-- Si la empresa cambia de nombre, sus ofertas se siguen encontrando por el nombre nuevo.
create function public.companies_after_rename()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_job_search_vector(j.id) from public.jobs j where j.company_id = new.id;
  return null;
end;
$$;

create trigger companies_after_rename after update of name on public.companies
  for each row execute function public.companies_after_rename();

revoke execute on function public.refresh_job_search_vector(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------

alter table public.jobs enable row level security;
alter table public.job_skills enable row level security;
alter table public.job_questions enable row level security;

revoke all on public.jobs from anon, authenticated;
grant select on public.jobs to anon, authenticated;
grant insert (company_id, source, status, title, description, summary, language, seniority, employment_type, work_mode,
              country, city, salary_min, salary_max, salary_currency, salary_period, salary_basis, valid_through,
              external_url, external_provider, external_id)
  on public.jobs to authenticated;
grant update (status, title, description, summary, language, seniority, employment_type, work_mode, country, city,
              salary_min, salary_max, salary_currency, salary_period, salary_basis, valid_through, external_url)
  on public.jobs to authenticated;
grant delete on public.jobs to authenticated;

-- ¿La oferta se ve públicamente? Publicada, vigente y de una empresa no suspendida.
create function public.is_job_public(p_job public.jobs)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_job.status = 'published'
    and p_job.valid_through > now()
    and exists (select 1 from public.companies c where c.id = p_job.company_id and c.status <> 'suspended');
$$;

grant execute on function public.is_job_public(public.jobs) to anon, authenticated;

create policy "jobs: públicas, de mi empresa o admin" on public.jobs
  for select to anon, authenticated
  using ((select public.is_job_public(jobs)) or company_id = (select public.my_company_id()) or (select public.is_admin()));

create policy "jobs: las crean los miembros (nativas) o el admin" on public.jobs
  for insert to authenticated
  with check (
    (source = 'native' and company_id = (select public.my_company_id()))
    or (select public.is_admin())
  );

create policy "jobs: las editan los miembros o el admin" on public.jobs
  for update to authenticated
  using ((source = 'native' and company_id = (select public.my_company_id())) or (select public.is_admin()))
  with check ((source = 'native' and company_id = (select public.my_company_id())) or (select public.is_admin()));

create policy "jobs: se borran solo los borradores" on public.jobs
  for delete to authenticated
  using (status = 'draft' and (company_id = (select public.my_company_id()) or (select public.is_admin())));

-- Habilidades y preguntas: las ve quien ve la oferta y las edita quien edita la oferta.
create function public.can_edit_job(p_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.jobs j
    where j.id = p_job_id
      and ((j.source = 'native' and j.company_id = public.my_company_id()) or public.is_admin())
  );
$$;

grant execute on function public.can_edit_job(uuid) to authenticated;

revoke all on public.job_skills from anon, authenticated;
grant select on public.job_skills to anon, authenticated;
grant insert, delete on public.job_skills to authenticated;

create policy "job_skills: visibles con la oferta" on public.job_skills
  for select to anon, authenticated using (exists (select 1 from public.jobs j where j.id = job_id));
create policy "job_skills: las agrega quien edita la oferta" on public.job_skills
  for insert to authenticated with check ((select public.can_edit_job(job_id)));
create policy "job_skills: las quita quien edita la oferta" on public.job_skills
  for delete to authenticated using ((select public.can_edit_job(job_id)));

revoke all on public.job_questions from anon, authenticated;
grant select on public.job_questions to anon, authenticated;
grant insert, delete on public.job_questions to authenticated;
grant update (type, prompt, options, required) on public.job_questions to authenticated;

create policy "job_questions: visibles con la oferta" on public.job_questions
  for select to anon, authenticated using (exists (select 1 from public.jobs j where j.id = job_id));
create policy "job_questions: las crea quien edita la oferta" on public.job_questions
  for insert to authenticated with check ((select public.can_edit_job(job_id)));
create policy "job_questions: las edita quien edita la oferta" on public.job_questions
  for update to authenticated using ((select public.can_edit_job(job_id)));
create policy "job_questions: las borra quien edita la oferta" on public.job_questions
  for delete to authenticated using ((select public.can_edit_job(job_id)));
