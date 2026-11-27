-- Sincronización con las APIs públicas de Greenhouse, Lever, Ashby y Workable.
-- El admin carga el identificador público del tablero; un proceso diario crea o actualiza las ofertas
-- y cierra las que desaparecieron. Las ofertas sincronizadas son importadas: resumen + enlace al original.

create table public.import_sources (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  provider public.import_provider not null check (provider <> 'manual'),
  board_token text not null check (board_token ~ '^[A-Za-z0-9_.-]{1,100}$'),
  active boolean not null default true,
  last_attempt_at timestamptz,
  last_synced_at timestamptz,
  last_error text check (char_length(last_error) <= 200),
  last_result jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index import_sources_provider_token_key on public.import_sources (provider, lower(board_token));

-- Solo el admin (por funciones) y el proceso del servidor (service_role) la tocan.
alter table public.import_sources enable row level security;
revoke all on public.import_sources from anon, authenticated;

alter table public.jobs add column import_source_id uuid references public.import_sources (id) on delete set null;
create index jobs_import_source_idx on public.jobs (import_source_id) where import_source_id is not null;

-- Aplica el resultado de una sincronización. p_jobs: [{externalId, title, url, summary, language, seniority,
-- employmentType, workMode, country, city, salaryMin, salaryMax, salaryCurrency, salaryPeriod}].
-- Las ofertas inválidas se saltean (y se cuentan) en vez de frenar todo el tablero.
-- p_skipped: las que el servidor ya descartó al normalizar, para que el resultado las incluya.
create function public.sync_import_source(p_source_id uuid, p_jobs jsonb, p_skipped int default 0)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source public.import_sources%rowtype;
  v_job jsonb;
  v_external_id text;
  v_ids text[] := '{}';
  v_inserted boolean;
  v_created int := 0;
  v_updated int := 0;
  v_skipped int := greatest(coalesce(p_skipped, 0), 0);
  v_closed int := 0;
  v_result jsonb;
begin
  select * into v_source from public.import_sources where id = p_source_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_jobs) is distinct from 'array' then
    raise exception 'invalid_payload' using errcode = 'P0001';
  end if;

  for v_job in select value from jsonb_array_elements(p_jobs) limit 500 loop
    begin
      v_external_id := lower(v_source.board_token) || ':' || (v_job ->> 'externalId');
      v_inserted := null;
      insert into public.jobs (company_id, source, status, title, summary, language, seniority, employment_type, work_mode,
        country, city, salary_min, salary_max, salary_currency, salary_period, salary_basis, valid_through,
        external_url, external_provider, external_id, import_source_id)
      values (
        v_source.company_id, 'imported', 'published', v_job ->> 'title', coalesce(v_job ->> 'summary', ''),
        (v_job ->> 'language')::public.app_locale, (v_job ->> 'seniority')::public.seniority,
        (v_job ->> 'employmentType')::public.employment_type, (v_job ->> 'workMode')::public.work_mode,
        v_job ->> 'country', v_job ->> 'city',
        (v_job ->> 'salaryMin')::numeric, (v_job ->> 'salaryMax')::numeric,
        (v_job ->> 'salaryCurrency')::public.currency, (v_job ->> 'salaryPeriod')::public.salary_period,
        case when v_job ->> 'salaryMin' is not null then 'gross'::public.salary_basis end,
        now() + interval '30 days', v_job ->> 'url', v_source.provider, v_external_id, v_source.id
      )
      on conflict (external_provider, external_id) do update set
        title = excluded.title,
        summary = excluded.summary,
        language = excluded.language,
        seniority = excluded.seniority,
        employment_type = excluded.employment_type,
        work_mode = excluded.work_mode,
        country = excluded.country,
        city = excluded.city,
        salary_min = excluded.salary_min,
        salary_max = excluded.salary_max,
        salary_currency = excluded.salary_currency,
        salary_period = excluded.salary_period,
        salary_basis = excluded.salary_basis,
        external_url = excluded.external_url,
        -- Una oferta dura como mucho 90 días desde que se creó.
        valid_through = least(excluded.valid_through, public.jobs.created_at + interval '90 days'),
        -- Si reaparece en el tablero, vuelve a publicarse; lo que ocultó la moderación sigue oculto.
        status = case
          when public.jobs.status = 'hidden' then public.jobs.status
          when least(excluded.valid_through, public.jobs.created_at + interval '90 days') <= now() then public.jobs.status
          else 'published'::public.job_status
        end,
        updated_at = now()
      -- Nunca pisa una oferta de otro tablero.
      where public.jobs.import_source_id = v_source.id
      returning (xmax = 0) into v_inserted;

      if v_inserted is null then
        v_skipped := v_skipped + 1;
      else
        v_ids := v_ids || v_external_id;
        if v_inserted then v_created := v_created + 1; else v_updated := v_updated + 1; end if;
      end if;
    exception
      when check_violation or not_null_violation or invalid_text_representation or numeric_value_out_of_range
           or string_data_right_truncation or raise_exception then
        v_skipped := v_skipped + 1;
    end;
  end loop;

  update public.jobs set status = 'closed'
  where import_source_id = v_source.id and status = 'published' and not (external_id = any (v_ids));
  get diagnostics v_closed = row_count;

  v_result := jsonb_build_object('created', v_created, 'updated', v_updated, 'skipped', v_skipped, 'closed', v_closed);
  update public.import_sources
  set last_attempt_at = now(), last_synced_at = now(), last_error = null, last_result = v_result
  where id = v_source.id;
  return v_result;
end;
$$;

create function public.record_import_error(p_source_id uuid, p_error text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.import_sources set last_attempt_at = now(), last_error = left(p_error, 200) where id = p_source_id;
$$;

revoke execute on function public.sync_import_source(uuid, jsonb, int) from public, anon, authenticated;
revoke execute on function public.record_import_error(uuid, text) from public, anon, authenticated;
grant execute on function public.sync_import_source(uuid, jsonb, int) to service_role;
grant execute on function public.record_import_error(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------

create function public.admin_add_import_source(p_company_name text, p_website_url text, p_provider public.import_provider, p_board_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  if p_provider = 'manual' then
    raise exception 'invalid_provider' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_board_token), '') !~ '^[A-Za-z0-9_.-]{1,100}$' then
    raise exception 'invalid_token' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.import_sources where provider = p_provider and lower(board_token) = lower(trim(p_board_token))) then
    raise exception 'source_exists' using errcode = 'P0001';
  end if;

  v_company_id := public.admin_upsert_unclaimed_company(p_company_name, p_website_url);
  insert into public.import_sources (company_id, provider, board_token, created_by)
  values (v_company_id, p_provider, trim(p_board_token), (select auth.uid()))
  returning id into v_id;
  perform public.write_audit_log('import_source.created', 'import_source', v_id::text,
    jsonb_build_object('provider', p_provider, 'board_token', trim(p_board_token)));
  return v_id;
end;
$$;

create function public.admin_import_sources()
returns table (id uuid, company_name text, company_slug text, provider public.import_provider, board_token text, active boolean,
               last_attempt_at timestamptz, last_synced_at timestamptz, last_error text, last_result jsonb, open_jobs bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  return query
    select s.id, c.name, c.slug::text, s.provider, s.board_token, s.active, s.last_attempt_at, s.last_synced_at, s.last_error, s.last_result,
           (select count(*) from public.jobs j where j.import_source_id = s.id and j.status = 'published' and j.valid_through > now())
    from public.import_sources s join public.companies c on c.id = s.company_id
    order by s.created_at desc
    limit 200;
end;
$$;

create function public.admin_set_import_source_active(p_source_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  update public.import_sources set active = p_active where id = p_source_id;
  perform public.write_audit_log(case when p_active then 'import_source.resumed' else 'import_source.paused' end,
    'import_source', p_source_id::text, '{}'::jsonb);
end;
$$;

revoke execute on function public.admin_add_import_source(text, text, public.import_provider, text) from public, anon;
revoke execute on function public.admin_import_sources() from public, anon;
revoke execute on function public.admin_set_import_source_active(uuid, boolean) from public, anon;
grant execute on function public.admin_add_import_source(text, text, public.import_provider, text) to authenticated;
grant execute on function public.admin_import_sources() to authenticated;
grant execute on function public.admin_set_import_source_active(uuid, boolean) to authenticated;
