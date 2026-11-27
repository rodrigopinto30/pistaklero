-- Anti-ghosting: plazos de 7, 14 y 30 días, y el badge público de velocidad de respuesta.

create type public.response_badge as enum ('new', 'fast', 'medium', 'slow');

create table public.company_response_stats (
  company_id uuid primary key references public.companies (id) on delete cascade,
  window_applications int not null default 0,
  median_first_response_hours numeric,
  responded_within_14d_pct numeric,
  badge public.response_badge not null default 'new',
  computed_at timestamptz not null default now()
);

alter table public.company_response_stats enable row level security;
revoke all on public.company_response_stats from anon, authenticated;
grant select on public.company_response_stats to anon, authenticated;
create policy "stats: públicas" on public.company_response_stats for select to anon, authenticated using (true);

-- Recalcula el badge de una empresa con las postulaciones de los últimos 90 días.
--   new:    menos de 5 postulaciones en la ventana
--   fast:   mediana de primera respuesta <= 48 h y >= 80 % respondidas antes de los 14 días
--   medium: mediana <= 7 días y >= 50 % respondidas antes de los 14 días
--   slow:   el resto
-- Las postulaciones de menos de 14 días todavía sin respuesta no cuentan (aún están a tiempo).
create function public.refresh_company_response_stats(p_company_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total int;
  v_median numeric;
  v_pct numeric;
begin
  with apps as (
    select a.created_at, a.first_response_at
    from public.applications a join public.jobs j on j.id = a.job_id
    where j.company_id = p_company_id
      and a.created_at > now() - interval '90 days'
      and not (a.status = 'withdrawn' and a.first_response_at is null)
  ),
  measurable as (
    select * from apps where first_response_at is not null or created_at < now() - interval '14 days'
  )
  select
    (select count(*) from apps),
    (select percentile_cont(0.5) within group (order by extract(epoch from first_response_at - created_at) / 3600)
       from measurable where first_response_at is not null),
    (select case when count(*) = 0 then null
            else count(*) filter (where first_response_at - created_at <= interval '14 days')::numeric / count(*) end
       from measurable)
  into v_total, v_median, v_pct;

  insert into public.company_response_stats (company_id, window_applications, median_first_response_hours, responded_within_14d_pct, badge, computed_at)
  values (
    p_company_id, v_total, round(v_median, 1), round(v_pct, 3),
    case
      when v_total < 5 or v_pct is null then 'new'
      when v_median <= 48 and v_pct >= 0.8 then 'fast'
      when v_median <= 168 and v_pct >= 0.5 then 'medium'
      else 'slow'
    end::public.response_badge,
    now()
  )
  on conflict (company_id) do update set
    window_applications = excluded.window_applications,
    median_first_response_hours = excluded.median_first_response_hours,
    responded_within_14d_pct = excluded.responded_within_14d_pct,
    badge = excluded.badge,
    computed_at = excluded.computed_at;
end;
$$;

-- Tarea diaria. Es idempotente: correrla dos veces el mismo día no duplica avisos.
create function public.daily_maintenance()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_closed int := 0;
  v_warned int := 0;
  v_reminded int := 0;
  v_row record;
begin
  -- 30 días sin cambios: se cierra como "Sin respuesta" y la candidata queda liberada.
  for v_row in
    select a.id, a.status, a.candidate_id, j.title, c.name as company_name
    from public.applications a join public.jobs j on j.id = a.job_id join public.companies c on c.id = j.company_id
    where a.status in ('received', 'in_review') and a.status_changed_at < now() - interval '30 days'
    for update of a skip locked
  loop
    update public.applications set status = 'no_response', status_changed_at = now(), closed_at = now() where id = v_row.id;
    insert into public.application_events (application_id, from_status, to_status, actor_type)
    values (v_row.id, v_row.status, 'no_response', 'system');
    perform public.enqueue_email(u.email, v_row.candidate_id, 'application_status', p.locale,
      jsonb_build_object('jobTitle', v_row.title, 'companyName', v_row.company_name, 'status', 'no_response'),
      'status:' || v_row.id || ':no_response')
    from auth.users u join public.profiles p on p.id = u.id where u.id = v_row.candidate_id;
    v_closed := v_closed + 1;
  end loop;

  -- 14 días sin cambios: se avisa a la candidata (una sola vez por postulación).
  for v_row in
    select a.id, a.candidate_id, j.title, c.name as company_name
    from public.applications a join public.jobs j on j.id = a.job_id join public.companies c on c.id = j.company_id
    where a.status in ('received', 'in_review') and a.status_changed_at < now() - interval '14 days' and a.candidate_warned_at is null
  loop
    update public.applications set candidate_warned_at = now() where id = v_row.id;
    perform public.enqueue_email(u.email, v_row.candidate_id, 'application_slow', p.locale,
      jsonb_build_object('jobTitle', v_row.title, 'companyName', v_row.company_name),
      'slow:' || v_row.id)
    from auth.users u join public.profiles p on p.id = u.id where u.id = v_row.candidate_id;
    v_warned := v_warned + 1;
  end loop;

  -- 7 días sin cambios: un solo recordatorio por empresa y por día, para cada miembro del equipo.
  for v_row in
    select j.company_id, c.name as company_name, count(*) as pending
    from public.applications a join public.jobs j on j.id = a.job_id join public.companies c on c.id = j.company_id
    where a.status in ('received', 'in_review') and a.status_changed_at < now() - interval '7 days'
      and a.recruiter_reminded_at is null and c.status = 'active'
    group by j.company_id, c.name
  loop
    update public.applications a set recruiter_reminded_at = now()
    from public.jobs j
    where j.id = a.job_id and j.company_id = v_row.company_id
      and a.status in ('received', 'in_review') and a.status_changed_at < now() - interval '7 days' and a.recruiter_reminded_at is null;
    perform public.enqueue_email(u.email, m.user_id, 'recruiter_reminder', p.locale,
      jsonb_build_object('companyName', v_row.company_name, 'pending', v_row.pending),
      'remind:' || v_row.company_id || ':' || m.user_id || ':' || current_date)
    from public.company_members m join auth.users u on u.id = m.user_id join public.profiles p on p.id = m.user_id
    where m.company_id = v_row.company_id and p.suspended_at is null;
    v_reminded := v_reminded + 1;
  end loop;

  -- Badges de todas las empresas con actividad o con badge previo.
  perform public.refresh_company_response_stats(c.id)
  from public.companies c
  where exists (select 1 from public.jobs j where j.company_id = c.id);

  return jsonb_build_object('closed', v_closed, 'warned', v_warned, 'reminded_companies', v_reminded);
end;
$$;

revoke execute on function public.refresh_company_response_stats(uuid) from public, anon, authenticated;
revoke execute on function public.daily_maintenance() from public, anon, authenticated;
grant execute on function public.daily_maintenance() to service_role;

-- La búsqueda devuelve también el badge de la empresa (cambia el tipo de retorno: hay que recrearla).
drop function public.search_jobs(text, public.work_mode[], public.seniority[], public.employment_type[],
  public.currency, boolean, public.app_locale, text, int, int);

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
  company_logo_path text, company_verified boolean, company_badge public.response_badge, skills jsonb, total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with query as (
    select case
      when nullif(trim(coalesce(p_query, '')), '') is null then null
      else websearch_to_tsquery('pg_catalog.spanish', extensions.unaccent(left(p_query, 200)))
        || websearch_to_tsquery('pg_catalog.english', extensions.unaccent(left(p_query, 200)))
    end as tsq
  ),
  matches as (
    select j.*, c.name as c_name, c.slug as c_slug, c.logo_path as c_logo, c.verified_at as c_verified,
           coalesce(s.badge, 'new') as c_badge,
           case when query.tsq is null then 0 else ts_rank(j.search_vector, query.tsq) end as rank
    from public.jobs j
    join public.companies c on c.id = j.company_id
    left join public.company_response_stats s on s.company_id = c.id
    cross join query
    where j.status = 'published'
      and j.valid_through > now()
      and c.status <> 'suspended'
      and (query.tsq is null or j.search_vector @@ query.tsq)
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
         count(*) over ()
  from matches m
  order by m.rank desc, m.published_at desc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$$;

grant execute on function public.search_jobs(text, public.work_mode[], public.seniority[], public.employment_type[],
  public.currency, boolean, public.app_locale, text, int, int) to anon, authenticated;
