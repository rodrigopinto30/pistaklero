-- Búsqueda de ofertas para el inicio. Es security invoker: corre con los permisos de quien busca
-- (RLS incluida) y además filtra explícitamente lo publicado y vigente.

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
  id uuid,
  slug text,
  title text,
  source public.job_source,
  language public.app_locale,
  seniority public.seniority,
  employment_type public.employment_type,
  work_mode public.work_mode,
  country text,
  city text,
  salary_min numeric,
  salary_max numeric,
  salary_currency public.currency,
  salary_period public.salary_period,
  salary_basis public.salary_basis,
  published_at timestamptz,
  company_name text,
  company_slug text,
  company_logo_path text,
  company_verified boolean,
  skills jsonb,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with query as (
    -- Se busca con los dos diccionarios: la oferta puede estar en español o en inglés.
    select case
      when nullif(trim(coalesce(p_query, '')), '') is null then null
      else websearch_to_tsquery('pg_catalog.spanish', extensions.unaccent(left(p_query, 200)))
        || websearch_to_tsquery('pg_catalog.english', extensions.unaccent(left(p_query, 200)))
    end as tsq
  ),
  matches as (
    select j.*, c.name as c_name, c.slug as c_slug, c.logo_path as c_logo, c.verified_at as c_verified,
           case when query.tsq is null then 0 else ts_rank(j.search_vector, query.tsq) end as rank
    from public.jobs j
    join public.companies c on c.id = j.company_id
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
         m.published_at, m.c_name, m.c_slug::text, m.c_logo, m.c_verified is not null,
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
