-- "Mis ofertas": el listado de la empresa con los números de cada oferta (vistas, postulaciones por
-- etapa, clics afuera), las vistas por día, el cargo de cada persona en la empresa y quién publicó
-- cada oferta (al pie del aviso, como "Conocé al equipo de contratación" en LinkedIn).

-- ---------------------------------------------------------------------------
-- 1. Cargo de cada persona en su empresa ("Talent Acquisition", "CTO"…). Opcional.
-- ---------------------------------------------------------------------------
alter table public.company_members
  add column job_title text check (job_title is null or char_length(job_title) between 2 and 80);

create function public.set_my_job_title(p_title text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
begin
  if v_title is not null and char_length(v_title) not between 2 and 80 then
    raise exception 'invalid_job_title' using errcode = 'P0001';
  end if;
  update public.company_members set job_title = v_title where user_id = (select auth.uid());
  if not found then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function public.set_my_job_title(text) from public, anon;
grant execute on function public.set_my_job_title(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Vistas por día. Una por persona por día y por oferta, sin guardar quién vio: el servidor manda
--    un hash (HMAC con un secreto del día, de la cuenta o de la IP) que no se puede revertir, y los
--    hashes se borran a los dos días. La propia empresa no suma vistas.
-- ---------------------------------------------------------------------------
create table public.job_view_days (
  job_id uuid not null references public.jobs (id) on delete cascade,
  day date not null,
  views integer not null default 0 check (views >= 0),
  primary key (job_id, day)
);

create table public.job_view_keys (
  job_id uuid not null references public.jobs (id) on delete cascade,
  day date not null,
  key_hash text not null check (key_hash ~ '^[0-9a-f]{64}$'),
  primary key (job_id, day, key_hash)
);

alter table public.job_view_days enable row level security;
alter table public.job_view_keys enable row level security;
revoke all on public.job_view_days from anon, authenticated;
revoke all on public.job_view_keys from anon, authenticated;

-- Solo el servidor (service_role) la llama: si la pudiera llamar cualquiera, inventaría hashes.
create function public.record_job_view(p_job_id uuid, p_key_hash text, p_viewer uuid default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.jobs%rowtype;
  v_day date := (now() at time zone 'utc')::date;
  v_new boolean;
begin
  if p_key_hash is null or p_key_hash !~ '^[0-9a-f]{64}$' then
    return false;
  end if;
  select * into v_job from public.jobs where id = p_job_id;
  if not found or not public.is_job_public(v_job) then
    return false;
  end if;
  if p_viewer is not null and exists (
    select 1 from public.company_members m where m.user_id = p_viewer and m.company_id = v_job.company_id
  ) then
    return false;
  end if;

  insert into public.job_view_keys (job_id, day, key_hash) values (p_job_id, v_day, p_key_hash)
  on conflict do nothing;
  get diagnostics v_new = row_count;
  if not v_new then
    return false;
  end if;
  insert into public.job_view_days (job_id, day, views) values (p_job_id, v_day, 1)
  on conflict (job_id, day) do update set views = public.job_view_days.views + 1;
  return true;
end;
$$;

revoke execute on function public.record_job_view(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.record_job_view(uuid, text, uuid) to service_role;

create function public.purge_job_view_keys()
returns integer
language sql
security definer
set search_path = ''
as $$
  with deleted as (
    delete from public.job_view_keys where day < (now() at time zone 'utc')::date - 1 returning 1
  )
  select count(*)::int from deleted;
$$;

revoke execute on function public.purge_job_view_keys() from public, anon, authenticated;
grant execute on function public.purge_job_view_keys() to service_role;

-- ---------------------------------------------------------------------------
-- 3. El listado de "Mis ofertas", con buscador, filtros y los números de cada una.
--    p_status: active (publicada y vigente), expired (publicada y vencida), draft, closed, hidden.
-- ---------------------------------------------------------------------------
create function public.company_job_stats(
  p_query text default null,
  p_status text default null,
  p_creator uuid default null,
  p_mode public.work_mode default null,
  p_sort text default 'recent',
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid, slug text, title text, status public.job_status, work_mode public.work_mode,
  seniority public.seniority, created_at timestamptz, published_at timestamptz, valid_through timestamptz,
  created_by uuid, creator_name text, external boolean, views bigint, views_7d bigint,
  applications bigint, by_status jsonb, external_clicks bigint, total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_company uuid := public.my_company_id();
  v_needle text := public.like_needle(p_query);
begin
  if v_company is null then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  return query
  with base as (
    select j.*,
      (select count(*) from public.applications a where a.job_id = j.id) as apps
    from public.jobs j
    where j.company_id = v_company
      and (v_needle is null or lower(extensions.unaccent(j.title)) like '%' || v_needle || '%')
      and (p_status is null
        or (p_status = 'active' and j.status = 'published' and j.valid_through > now())
        or (p_status = 'expired' and j.status = 'published' and j.valid_through <= now())
        or (p_status in ('draft', 'closed', 'hidden') and j.status::text = p_status))
      and (p_creator is null or j.created_by = p_creator)
      and (p_mode is null or j.work_mode = p_mode)
  )
  select b.id, b.slug::text, b.title, b.status, b.work_mode, b.seniority, b.created_at, b.published_at,
    b.valid_through, b.created_by, pe.full_name, (b.external_url is not null),
    coalesce((select sum(v.views) from public.job_view_days v where v.job_id = b.id), 0)::bigint,
    coalesce((select sum(v.views) from public.job_view_days v
              where v.job_id = b.id and v.day > (now() at time zone 'utc')::date - 7), 0)::bigint,
    b.apps,
    coalesce((select jsonb_object_agg(s.status, s.n)
              from (select a.status, count(*) as n from public.applications a where a.job_id = b.id group by a.status) s),
             '{}'::jsonb),
    (select count(*) from public.external_apply_clicks c where c.job_id = b.id),
    count(*) over ()
  from base b
  left join public.people pe on pe.user_id = b.created_by
  order by
    case when p_sort = 'applications' then b.apps end desc nulls last,
    b.created_at desc,
    b.id
  limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0);
end;
$$;

revoke execute on function public.company_job_stats(text, text, uuid, public.work_mode, text, int, int) from public, anon;
grant execute on function public.company_job_stats(text, text, uuid, public.work_mode, text, int, int) to authenticated;

-- Vistas y postulaciones por día de una oferta propia (para el resumen).
create function public.company_job_daily(p_job_id uuid, p_days int default 30)
returns table (day date, views integer, applications integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days int := least(greatest(coalesce(p_days, 30), 1), 90);
  v_today date := (now() at time zone 'utc')::date;
begin
  if not exists (select 1 from public.jobs j where j.id = p_job_id and j.company_id = public.my_company_id()) then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  return query
  select d::date,
    coalesce(v.views, 0),
    coalesce(a.n, 0)::int
  from generate_series(v_today - (v_days - 1), v_today, interval '1 day') as d
  left join public.job_view_days v on v.job_id = p_job_id and v.day = d::date
  left join (
    select (ap.created_at at time zone 'utc')::date as day, count(*) as n
    from public.applications ap where ap.job_id = p_job_id group by 1
  ) a on a.day = d::date
  order by 1;
end;
$$;

revoke execute on function public.company_job_daily(uuid, int) from public, anon;
grant execute on function public.company_job_daily(uuid, int) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Quién publicó la oferta: nombre, foto y cargo, mientras siga en la empresa. Solo ofertas
--    propias y públicas (las importadas no tienen una persona detrás).
-- ---------------------------------------------------------------------------
create function public.job_poster(p_job_id uuid)
returns table (user_id uuid, full_name text, avatar_path text, job_title text)
language sql
stable
security definer
set search_path = ''
as $$
  select pe.user_id, pe.full_name, pe.avatar_path, m.job_title
  from public.jobs j
  join public.company_members m on m.user_id = j.created_by and m.company_id = j.company_id
  join public.people pe on pe.user_id = j.created_by
  join public.profiles pr on pr.id = j.created_by and pr.suspended_at is null
  where j.id = p_job_id
    and j.source = 'native'
    and public.is_job_public(j);
$$;

grant execute on function public.job_poster(uuid) to anon, authenticated;
