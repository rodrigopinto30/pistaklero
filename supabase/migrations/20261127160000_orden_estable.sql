-- Orden estable en todas las grillas: el mismo pedido devuelve siempre el mismo orden.
-- Antes, dar "me gusta" o guardar podía mover las tarjetas, porque el orden dependía de los likes
-- y, entre empates, Postgres podía devolverlas en cualquier orden.

-- Empresas: primero las que contratan y después las más nuevas. Ya no se ordena por "me gusta":
-- cada like movía la tarjeta de lugar mientras la persona la miraba.
create or replace function public.company_cards(
  p_query text default null,
  p_saved_only boolean default false,
  p_company_id uuid default null,
  p_limit int default 24,
  p_offset int default 0
)
returns table (
  id uuid, slug text, name text, industry text, city text, country text, cover_path text, logo_path text,
  verified boolean, likes_count int, open_jobs bigint, liked boolean, saved boolean, total_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with q as (select public.like_needle(p_query) as needle),
  open_jobs as (
    select j.company_id, count(*) as n
    from public.jobs j
    where j.status = 'published' and j.valid_through > now()
    group by j.company_id
  )
  select c.id, c.slug::text, c.name, c.industry, c.city, c.country, c.cover_path, c.logo_path,
         c.verified_at is not null, c.likes_count, coalesce(oj.n, 0),
         exists (select 1 from public.company_likes l where l.company_id = c.id and l.user_id = (select auth.uid())),
         exists (select 1 from public.saved_companies s where s.company_id = c.id and s.user_id = (select auth.uid())),
         count(*) over ()
  from public.companies c
  left join open_jobs oj on oj.company_id = c.id
  cross join q
  where c.status <> 'suspended'
    and (p_company_id is null or c.id = p_company_id)
    -- En el listado, las sin reclamar solo si tienen ofertas (las importadas): una página vacía no suma.
    and (c.status = 'active' or coalesce(oj.n, 0) > 0 or p_company_id is not null)
    and (not p_saved_only or exists (select 1 from public.saved_companies s where s.company_id = c.id and s.user_id = (select auth.uid())))
    and (q.needle is null
         or lower(extensions.unaccent(c.name)) like '%' || q.needle || '%'
         or lower(extensions.unaccent(coalesce(c.industry, ''))) like '%' || q.needle || '%')
  order by (coalesce(oj.n, 0) > 0) desc, c.created_at desc, c.id
  limit least(greatest(p_limit, 1), 60)
  offset greatest(p_offset, 0);
$$;

-- Publicaciones: el id desempata (dos con la misma fecha salían en cualquier orden).
create or replace function public.post_cards(
  p_query text default null,
  p_author_id uuid default null,
  p_company_id uuid default null,
  p_saved_only boolean default false,
  p_post_id uuid default null,
  p_limit int default 24,
  p_offset int default 0
)
returns table (
  id uuid, slug text, title text, excerpt text, language public.app_locale, created_at timestamptz,
  likes_count int, author_name text, author_avatar text, author_role public.user_role,
  author_profile_slug text, author_company_name text, author_company_slug text,
  liked boolean, saved boolean, total_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with q as (select public.like_needle(p_query) as needle)
  select p.id, p.slug::text, p.title, p.excerpt, p.language, p.created_at, p.likes_count,
         pe.full_name, pe.avatar_path, pr.role,
         case when pr.role = 'candidate' and public.can_view_candidate(p.author_id)
              then (select c.slug::text from public.candidates c where c.user_id = p.author_id) end,
         co.name, co.slug::text,
         exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = (select auth.uid())),
         exists (select 1 from public.saved_posts s where s.post_id = p.id and s.user_id = (select auth.uid())),
         count(*) over ()
  from public.posts p
  join public.people pe on pe.user_id = p.author_id
  join public.profiles pr on pr.id = p.author_id
  left join public.company_members m on m.user_id = p.author_id and pr.role = 'recruiter'
  left join public.companies co on co.id = m.company_id and co.status <> 'suspended'
  cross join q
  where p.status = 'published'
    and pr.suspended_at is null
    and (p_post_id is null or p.id = p_post_id)
    and (p_author_id is null or p.author_id = p_author_id)
    and (p_company_id is null or m.company_id = p_company_id)
    and (not p_saved_only or exists (select 1 from public.saved_posts s where s.post_id = p.id and s.user_id = (select auth.uid())))
    and (q.needle is null
         or lower(extensions.unaccent(p.title)) like '%' || q.needle || '%'
         or lower(extensions.unaccent(p.body)) like '%' || q.needle || '%')
  order by p.created_at desc, p.id
  limit least(greatest(p_limit, 1), 60)
  offset greatest(p_offset, 0);
$$;

-- Búsqueda de empleos: mismo desempate, así la paginación no repite ni saltea ofertas.
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
  order by m.rank desc, m.published_at desc, m.id
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$$;

-- Empleos de una empresa y empleos guardados: mismo desempate.
create or replace function public.company_job_cards(p_company_id uuid)
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
  select j.id, j.slug::text, j.title, j.source, j.language, j.seniority, j.employment_type, j.work_mode,
         j.country, j.city, j.salary_min, j.salary_max, j.salary_currency, j.salary_period, j.salary_basis,
         j.published_at, c.name, c.slug::text, c.logo_path, c.verified_at is not null, coalesce(st.badge, 'new'),
         coalesce((
           select jsonb_agg(jsonb_build_object('es', s.name_es, 'en', s.name_en) order by s.slug)
           from (select s.* from public.job_skills js join public.skills s on s.id = js.skill_id
                 where js.job_id = j.id order by s.slug limit 3) s
         ), '[]'::jsonb),
         count(*) over ()
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

create or replace function public.saved_job_cards()
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
  select j.id, j.slug::text, j.title, j.source, j.language, j.seniority, j.employment_type, j.work_mode,
         j.country, j.city, j.salary_min, j.salary_max, j.salary_currency, j.salary_period, j.salary_basis,
         j.published_at, c.name, c.slug::text, c.logo_path, c.verified_at is not null, coalesce(st.badge, 'new'),
         coalesce((
           select jsonb_agg(jsonb_build_object('es', s.name_es, 'en', s.name_en) order by s.slug)
           from (select s.* from public.job_skills js join public.skills s on s.id = js.skill_id
                 where js.job_id = j.id order by s.slug limit 3) s
         ), '[]'::jsonb),
         count(*) over ()
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
