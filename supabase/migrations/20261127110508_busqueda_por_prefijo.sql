-- La búsqueda encuentra también palabras a medio escribir: "desa" trae "Desarrollador/a Frontend".
-- Se suman dos criterios a la búsqueda de texto completo:
--   1. cada palabra de 3 letras o más como prefijo de las palabras indexadas ('desa':*);
--   2. el texto tal cual dentro del título o del nombre de la empresa, sin acentos ni mayúsculas.
-- Las coincidencias en el título van primero.

-- "Desarrollo  web!" → '''desarrollo'':* & ''web'':*' (null si no queda ninguna palabra útil).
create function public.prefix_tsquery(p_query text)
returns tsquery
language sql
stable
set search_path = ''
as $$
  select to_tsquery('pg_catalog.simple', string_agg(quote_literal(w) || ':*', ' & '))
  from (
    select w
    from regexp_split_to_table(lower(extensions.unaccent(left(coalesce(p_query, ''), 200))), '[^a-z0-9ñ]+') as w
    where char_length(w) >= 3
    limit 8
  ) words
  having count(*) > 0;
$$;

-- Texto para comparar con LIKE: sin acentos, en minúsculas y con los comodines escapados.
create function public.like_needle(p_query text)
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(
    replace(replace(replace(lower(extensions.unaccent(trim(left(coalesce(p_query, ''), 200)))), '\', '\\'), '%', '\%'), '_', '\_'),
    ''
  );
$$;

grant execute on function public.prefix_tsquery(text) to anon, authenticated;
grant execute on function public.like_needle(text) to anon, authenticated;

create or replace function public.search_jobs(
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
         count(*) over ()
  from matches m
  order by m.rank desc, m.published_at desc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$$;
