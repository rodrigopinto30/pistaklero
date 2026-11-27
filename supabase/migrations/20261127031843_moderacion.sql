-- Moderación: reportes de ofertas (con ocultamiento automático) y herramientas del admin.

create type public.report_reason as enum ('scam', 'fake', 'discrimination', 'other');
create type public.report_status as enum ('open', 'dismissed', 'actioned');

create table public.job_reports (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  reporter_id uuid references auth.users (id) on delete set null,
  reason public.report_reason not null,
  details text not null default '' check (char_length(details) <= 500),
  status public.report_status not null default 'open',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (job_id, reporter_id)
);

create index job_reports_open_idx on public.job_reports (job_id) where status = 'open';

alter table public.job_reports enable row level security;
revoke all on public.job_reports from anon, authenticated;
grant select on public.job_reports to authenticated;
grant insert (job_id, reporter_id, reason, details) on public.job_reports to authenticated;

create policy "reportes: cada uno ve los suyos y el admin todos" on public.job_reports
  for select to authenticated using (reporter_id = (select auth.uid()) or (select public.is_admin()));
create policy "reportes: cualquier cuenta reporta una oferta pública" on public.job_reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and exists (select 1 from public.jobs j where j.id = job_id and public.is_job_public(j))
  );

-- Las acciones del sistema (no de una persona) pueden ocultar ofertas sin ser admin.
create or replace function public.jobs_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_system boolean := coalesce(current_setting('pistaklero.system', true), '') = 'on';
begin
  if tg_op = 'INSERT' then
    new.slug := public.random_slug(new.title);
    new.created_by := coalesce(new.created_by, (select auth.uid()));
  end if;

  -- Ocultar (moderación) es solo del admin o del sistema, y una oferta oculta solo la liberan ellos.
  if (new.status = 'hidden' or (tg_op = 'UPDATE' and old.status = 'hidden'))
     and new.status is distinct from (case when tg_op = 'UPDATE' then old.status end)
     and not public.is_admin()
     and not v_system
     and (select auth.uid()) is not null then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    if new.valid_through <= now() then
      raise exception 'expired' using errcode = 'P0001';
    end if;
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

-- Con 3 reportes abiertos de cuentas distintas, la oferta se oculta hasta que el admin la revise.
create function public.job_reports_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(distinct reporter_id) from public.job_reports where job_id = new.job_id and status = 'open') >= 3 then
    perform set_config('pistaklero.system', 'on', true);
    update public.jobs set status = 'hidden' where id = new.job_id and status = 'published';
    perform set_config('pistaklero.system', 'off', true);
  end if;
  return null;
end;
$$;

create trigger job_reports_after_insert after insert on public.job_reports
  for each row execute function public.job_reports_after_insert();

-- ---------------------------------------------------------------------------
-- Herramientas del admin (todas verifican is_admin y quedan auditadas)
-- ---------------------------------------------------------------------------

create function public.admin_review_report(p_report_id uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job_id uuid;
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  select job_id into v_job_id from public.job_reports where id = p_report_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  if p_action = 'dismiss' then
    -- Descartar todos los reportes de la oferta y volver a publicarla si estaba oculta.
    update public.job_reports set status = 'dismissed', reviewed_by = (select auth.uid()), reviewed_at = now()
    where job_id = v_job_id and status = 'open';
    update public.jobs set status = 'published' where id = v_job_id and status = 'hidden' and valid_through > now();
  elsif p_action = 'hide_job' then
    update public.job_reports set status = 'actioned', reviewed_by = (select auth.uid()), reviewed_at = now()
    where job_id = v_job_id and status = 'open';
    update public.jobs set status = 'hidden' where id = v_job_id;
  else
    raise exception 'invalid_action' using errcode = 'P0001';
  end if;

  perform public.write_audit_log('report.' || p_action, 'job', v_job_id::text, '{}'::jsonb);
end;
$$;

create function public.admin_set_company_status(p_company_id uuid, p_status public.company_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  update public.companies set status = p_status where id = p_company_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  perform public.write_audit_log('company.' || p_status, 'company', p_company_id::text, '{}'::jsonb);
end;
$$;

create function public.admin_set_user_suspended(p_user_id uuid, p_suspended boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'cannot_change_self' using errcode = 'P0001';
  end if;
  update public.profiles set suspended_at = case when p_suspended then now() end where id = p_user_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  perform public.write_audit_log(case when p_suspended then 'user.suspended' else 'user.restored' end, 'user', p_user_id::text, '{}'::jsonb);
end;
$$;

-- Buscar cuentas por email (auth.users no es legible desde el cliente).
create function public.admin_find_users(p_query text)
returns table (id uuid, email text, role public.user_role, suspended_at timestamptz, company_name text)
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
    select u.id, u.email::text, p.role, p.suspended_at, c.name
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.company_members m on m.user_id = u.id
    left join public.companies c on c.id = m.company_id
    where u.email ilike '%' || replace(replace(replace(left(trim(p_query), 80), '\', '\\'), '%', '\%'), '_', '\_') || '%'
    order by u.created_at desc
    limit 20;
end;
$$;

-- Resumen de reportes abiertos por oferta, para el panel del admin.
create function public.admin_open_reports()
returns table (job_id uuid, job_title text, job_slug text, job_status public.job_status, company_name text,
               reports bigint, reasons public.report_reason[], details text[], first_report_id uuid, last_reported_at timestamptz)
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
    select j.id, j.title, j.slug::text, j.status, c.name, count(*), array_agg(distinct r.reason),
           array_remove(array_agg(nullif(r.details, '')), null), (array_agg(r.id order by r.created_at))[1], max(r.created_at)
    from public.job_reports r
    join public.jobs j on j.id = r.job_id
    join public.companies c on c.id = j.company_id
    where r.status = 'open'
    group by j.id, j.title, j.slug, j.status, c.name
    order by count(*) desc, max(r.created_at) desc;
end;
$$;

revoke execute on function public.admin_review_report(uuid, text) from public, anon;
revoke execute on function public.admin_set_company_status(uuid, public.company_status) from public, anon;
revoke execute on function public.admin_set_user_suspended(uuid, boolean) from public, anon;
revoke execute on function public.admin_find_users(text) from public, anon;
revoke execute on function public.admin_open_reports() from public, anon;
grant execute on function public.admin_review_report(uuid, text) to authenticated;
grant execute on function public.admin_set_company_status(uuid, public.company_status) to authenticated;
grant execute on function public.admin_set_user_suspended(uuid, boolean) to authenticated;
grant execute on function public.admin_find_users(text) to authenticated;
grant execute on function public.admin_open_reports() to authenticated;
