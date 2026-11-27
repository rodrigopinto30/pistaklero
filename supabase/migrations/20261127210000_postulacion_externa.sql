-- Postular en otro sitio: una oferta propia también puede recibir las postulaciones afuera (por
-- ejemplo, en el portal de la empresa). La candidata cuenta si se postuló, para llevar el registro
-- en "Mis postulaciones" (como hace LinkedIn).

-- Las ofertas propias siguen pidiendo sueldo, pero ahora pueden tener un link de postulación externo.
alter table public.jobs drop constraint jobs_native_rules;
alter table public.jobs add constraint jobs_native_rules check (source <> 'native' or salary_min is not null);

-- El clic en "Postularme" (afuera) vale para cualquier oferta pública con link externo.
create or replace function public.record_external_click(p_job_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.jobs%rowtype;
begin
  select * into v_job from public.jobs where id = p_job_id;
  if not found or not public.is_job_public(v_job) or coalesce(v_job.external_url, '') !~ '^https://' then
    return null;
  end if;
  insert into public.external_apply_clicks (job_id, user_id) values (p_job_id, (select auth.uid()));
  return v_job.external_url;
end;
$$;

-- "Sí, me postulé": queda en la lista de la candidata. La empresa no lo ve (se postuló en su sitio).
create table public.external_applications (
  candidate_id uuid not null references public.candidates (user_id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (candidate_id, job_id)
);

create index external_applications_candidate_idx on public.external_applications (candidate_id, created_at desc);

alter table public.external_applications enable row level security;
revoke all on public.external_applications from anon, authenticated;
grant select, delete on public.external_applications to authenticated;

create policy "external_applications: cada una ve las suyas"
  on public.external_applications for select to authenticated
  using (candidate_id = (select auth.uid()));
create policy "external_applications: cada una quita las suyas"
  on public.external_applications for delete to authenticated
  using (candidate_id = (select auth.uid()));

create function public.record_external_application(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.jobs%rowtype;
begin
  if public.auth_role() is distinct from 'candidate' then
    raise exception 'not_candidate' using errcode = 'P0001';
  end if;
  select * into v_job from public.jobs where id = p_job_id;
  if not found or not public.is_job_public(v_job) or coalesce(v_job.external_url, '') !~ '^https://' then
    raise exception 'job_not_available' using errcode = 'P0001';
  end if;
  insert into public.external_applications (candidate_id, job_id) values ((select auth.uid()), p_job_id)
  on conflict do nothing;
end;
$$;

revoke execute on function public.record_external_application(uuid) from public, anon;
grant execute on function public.record_external_application(uuid) to authenticated;

-- La descarga de los datos de la cuenta suma las postulaciones en otros sitios.
create or replace function public.export_my_data()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'account', (select jsonb_build_object('id', u.id, 'email', u.email, 'created_at', u.created_at)
                from auth.users u where u.id = (select auth.uid())),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = (select auth.uid())),
    'person', (select jsonb_build_object('first_name', pe.first_name, 'middle_name', pe.middle_name, 'last_name', pe.last_name)
               from public.people pe where pe.user_id = (select auth.uid())),
    'candidate', (select to_jsonb(c) from public.candidates c where c.user_id = (select auth.uid())),
    'skills', coalesce((select jsonb_agg(jsonb_build_object('skill', s.slug, 'level', cs.level))
                        from public.candidate_skills cs join public.skills s on s.id = cs.skill_id
                        where cs.candidate_id = (select auth.uid())), '[]'::jsonb),
    'experiences', coalesce((select jsonb_agg(to_jsonb(e)) from public.candidate_experiences e where e.candidate_id = (select auth.uid())), '[]'::jsonb),
    'education', coalesce((select jsonb_agg(to_jsonb(e)) from public.candidate_education e where e.candidate_id = (select auth.uid())), '[]'::jsonb),
    'certifications', coalesce((select jsonb_agg(to_jsonb(e)) from public.candidate_certifications e where e.candidate_id = (select auth.uid())), '[]'::jsonb),
    'projects', coalesce((select jsonb_agg(to_jsonb(e)) from public.candidate_projects e where e.candidate_id = (select auth.uid())), '[]'::jsonb),
    'salary_expectation', (select to_jsonb(s) from public.candidate_salary_expectations s where s.candidate_id = (select auth.uid())),
    'blocked_companies', coalesce((select jsonb_agg(c.name) from public.candidate_blocked_companies b
                                   join public.companies c on c.id = b.company_id where b.candidate_id = (select auth.uid())), '[]'::jsonb),
    'applications', coalesce((select jsonb_agg(jsonb_build_object(
                                'job', j.title, 'company', co.name, 'status', a.status, 'applied_at', a.created_at,
                                'rejection_message', a.rejection_message,
                                'answers', (select jsonb_agg(jsonb_build_object('question', q.prompt, 'text', aa.answer_text, 'option', aa.answer_option))
                                            from public.application_answers aa join public.job_questions q on q.id = aa.question_id
                                            where aa.application_id = a.id),
                                'history', (select jsonb_agg(jsonb_build_object('status', ev.to_status, 'at', ev.created_at) order by ev.created_at)
                                            from public.application_events ev where ev.application_id = a.id)))
                              from public.applications a join public.jobs j on j.id = a.job_id join public.companies co on co.id = j.company_id
                              where a.candidate_id = (select auth.uid())), '[]'::jsonb),
    'company_membership', (select jsonb_build_object('company', c.name, 'role', m.member_role, 'since', m.created_at)
                           from public.company_members m join public.companies c on c.id = m.company_id
                           where m.user_id = (select auth.uid())),
    'saved_jobs', coalesce((select jsonb_agg(jsonb_build_object('job', j.title, 'saved_at', s.created_at))
                            from public.saved_jobs s join public.jobs j on j.id = s.job_id
                            where s.user_id = (select auth.uid())), '[]'::jsonb),
    'posts', coalesce((select jsonb_agg(jsonb_build_object('title', p.title, 'body', p.body, 'status', p.status, 'created_at', p.created_at))
                       from public.posts p where p.author_id = (select auth.uid())), '[]'::jsonb),
    'saved_posts', coalesce((select jsonb_agg(jsonb_build_object('post', p.title, 'saved_at', s.created_at))
                             from public.saved_posts s join public.posts p on p.id = s.post_id
                             where s.user_id = (select auth.uid())), '[]'::jsonb),
    'saved_companies', coalesce((select jsonb_agg(jsonb_build_object('company', c.name, 'saved_at', s.created_at))
                                 from public.saved_companies s join public.companies c on c.id = s.company_id
                                 where s.user_id = (select auth.uid())), '[]'::jsonb),
    'external_applications', coalesce((select jsonb_agg(jsonb_build_object('job', j.title, 'company', co.name, 'applied_at', x.created_at))
                                       from public.external_applications x join public.jobs j on j.id = x.job_id
                                       join public.companies co on co.id = j.company_id
                                       where x.candidate_id = (select auth.uid())), '[]'::jsonb),
    'reports', coalesce((select jsonb_agg(jsonb_build_object('job_id', r.job_id, 'reason', r.reason, 'at', r.created_at))
                         from public.job_reports r where r.reporter_id = (select auth.uid())), '[]'::jsonb)
  );
$$;

-- Postular en Pistaklero solo si la oferta no lleva a otro sitio (el botón ya lo distingue; esto lo
-- garantiza también para quien llame a la función directo).
create function public.applications_only_on_pistaklero()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.jobs where id = new.job_id and external_url is not null) then
    raise exception 'job_not_available' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger applications_only_on_pistaklero before insert on public.applications
  for each row execute function public.applications_only_on_pistaklero();

-- Las tarjetas de empleo dicen si "Postularme" lleva a otro sitio (external_apply).
drop function public.search_jobs(text, public.work_mode[], public.seniority[], public.employment_type[], public.currency, boolean, public.app_locale, text, int, int);
drop function public.company_job_cards(uuid);
drop function public.saved_job_cards();

create function public.search_jobs(
  p_query text default null,
  p_work_modes public.work_mode[] default null,
  p_seniorities public.seniority[] default null,
  p_employment_types public.employment_type[] default null,
  p_currency public.currency default null,
  p_salary_visible boolean default false,
  p_language public.app_locale default null,
  p_country text default null,
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid, slug text, title text, source public.job_source, language public.app_locale, seniority public.seniority,
  employment_type public.employment_type, work_mode public.work_mode, country text, city text,
  salary_min numeric, salary_max numeric, salary_currency public.currency, salary_period public.salary_period,
  salary_basis public.salary_basis, published_at timestamptz, company_name text, company_slug text,
  company_logo_path text, company_verified boolean, company_badge public.response_badge, skills jsonb, total_count bigint,
  external_apply boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  with query as (
    select
      case
        when nullif(trim(coalesce(p_query, '')), '') is null then null
        else websearch_to_tsquery('pg_catalog.spanish', extensions.unaccent(left(p_query, 200)))
          || websearch_to_tsquery('pg_catalog.english', extensions.unaccent(left(p_query, 200)))
      end as tsq,
      public.prefix_tsquery(p_query) as ptsq,
      public.like_needle(p_query) as needle
  ),
  matches as (
    select j.*, c.name as c_name, c.slug as c_slug, c.logo_path as c_logo, c.verified_at as c_verified,
           coalesce(s.badge, 'new') as c_badge,
           case
             when query.needle is null then 0
             when lower(extensions.unaccent(j.title)) like query.needle || '%' then 3
             when lower(extensions.unaccent(j.title)) like '%' || query.needle || '%' then 2
             else coalesce(ts_rank(j.search_vector, query.tsq), 0)
               + coalesce(ts_rank(j.search_vector, query.ptsq), 0)
           end as rank
    from public.jobs j
    join public.companies c on c.id = j.company_id
    left join public.company_response_stats s on s.company_id = c.id
    cross join query
    where j.status = 'published'
      and j.valid_through > now()
      and c.status <> 'suspended'
      and (
        query.needle is null
        or j.search_vector @@ query.tsq
        or j.search_vector @@ query.ptsq
        or lower(extensions.unaccent(j.title)) like '%' || query.needle || '%'
        or lower(extensions.unaccent(c.name)) like '%' || query.needle || '%'
      )
      and (p_work_modes is null or j.work_mode = any (p_work_modes))
      and (p_seniorities is null or j.seniority = any (p_seniorities))
      and (p_employment_types is null or j.employment_type = any (p_employment_types))
      and (p_currency is null or j.salary_currency = p_currency)
      and (not coalesce(p_salary_visible, false) or j.salary_min is not null)
      and (p_language is null or j.language = p_language)
      and (p_country is null or j.country = p_country)
  )
  select m.id, m.slug::text, m.title, m.source, m.language, m.seniority, m.employment_type, m.work_mode,
         m.country, m.city, m.salary_min, m.salary_max, m.salary_currency, m.salary_period, m.salary_basis,
         m.published_at, m.c_name, m.c_slug::text, m.c_logo, m.c_verified is not null, m.c_badge,
         coalesce((
           select jsonb_agg(jsonb_build_object('es', s.name_es, 'en', s.name_en) order by s.slug)
           from (select s.* from public.job_skills js join public.skills s on s.id = js.skill_id
                 where js.job_id = m.id order by s.slug limit 3) s
         ), '[]'::jsonb),
         count(*) over (),
         m.external_url is not null
  from matches m
  order by m.rank desc, m.published_at desc, m.id
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$$;

grant execute on function public.search_jobs(text, public.work_mode[], public.seniority[], public.employment_type[],
  public.currency, boolean, public.app_locale, text, int, int) to anon, authenticated;

create function public.company_job_cards(p_company_id uuid)
returns table (
  id uuid, slug text, title text, source public.job_source, language public.app_locale, seniority public.seniority,
  employment_type public.employment_type, work_mode public.work_mode, country text, city text,
  salary_min numeric, salary_max numeric, salary_currency public.currency, salary_period public.salary_period,
  salary_basis public.salary_basis, published_at timestamptz, company_name text, company_slug text,
  company_logo_path text, company_verified boolean, company_badge public.response_badge, skills jsonb, total_count bigint,
  external_apply boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select j.id, j.slug::text, j.title, j.source, j.language, j.seniority, j.employment_type, j.work_mode,
         j.country, j.city, j.salary_min, j.salary_max, j.salary_currency, j.salary_period, j.salary_basis,
         j.published_at, c.name, c.slug::text, c.logo_path, c.verified_at is not null, coalesce(st.badge, 'new'),
         coalesce((
           select jsonb_agg(jsonb_build_object('es', s.name_es, 'en', s.name_en) order by s.slug)
           from (select s.* from public.job_skills js join public.skills s on s.id = js.skill_id
                 where js.job_id = j.id order by s.slug limit 3) s
         ), '[]'::jsonb),
         count(*) over (),
         j.external_url is not null
  from public.jobs j
  join public.companies c on c.id = j.company_id
  left join public.company_response_stats st on st.company_id = c.id
  where j.company_id = p_company_id
    and j.status = 'published'
    and j.valid_through > now()
    and c.status <> 'suspended'
  order by j.published_at desc, j.id
  limit 100;
$$;

grant execute on function public.company_job_cards(uuid) to anon, authenticated;

create function public.saved_job_cards()
returns table (
  id uuid, slug text, title text, source public.job_source, language public.app_locale, seniority public.seniority,
  employment_type public.employment_type, work_mode public.work_mode, country text, city text,
  salary_min numeric, salary_max numeric, salary_currency public.currency, salary_period public.salary_period,
  salary_basis public.salary_basis, published_at timestamptz, company_name text, company_slug text,
  company_logo_path text, company_verified boolean, company_badge public.response_badge, skills jsonb, total_count bigint,
  external_apply boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select j.id, j.slug::text, j.title, j.source, j.language, j.seniority, j.employment_type, j.work_mode,
         j.country, j.city, j.salary_min, j.salary_max, j.salary_currency, j.salary_period, j.salary_basis,
         j.published_at, c.name, c.slug::text, c.logo_path, c.verified_at is not null, coalesce(st.badge, 'new'),
         coalesce((
           select jsonb_agg(jsonb_build_object('es', s.name_es, 'en', s.name_en) order by s.slug)
           from (select s.* from public.job_skills js join public.skills s on s.id = js.skill_id
                 where js.job_id = j.id order by s.slug limit 3) s
         ), '[]'::jsonb),
         count(*) over (),
         j.external_url is not null
  from public.saved_jobs sj
  join public.jobs j on j.id = sj.job_id
  join public.companies c on c.id = j.company_id
  left join public.company_response_stats st on st.company_id = c.id
  where sj.user_id = (select auth.uid())
    and j.status = 'published'
    and j.valid_through > now()
    and c.status <> 'suspended'
  order by sj.created_at desc, j.id
  limit 500;
$$;

grant execute on function public.saved_job_cards() to authenticated;
