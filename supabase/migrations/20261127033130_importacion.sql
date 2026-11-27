-- Ofertas importadas: empresas sin reclamar, clics hacia el sitio original y transferencia de empresas.

create table public.external_apply_clicks (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.jobs (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index external_apply_clicks_job_idx on public.external_apply_clicks (job_id);

alter table public.external_apply_clicks enable row level security;
revoke all on public.external_apply_clicks from anon, authenticated;

-- Registra un clic en "Postularme en el sitio original" y devuelve adónde ir.
-- Solo para ofertas importadas y públicas; cualquiera (también sin sesión) puede usarlo.
create function public.record_external_click(p_job_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.jobs%rowtype;
begin
  select * into v_job from public.jobs where id = p_job_id;
  if not found or v_job.source <> 'imported' or not public.is_job_public(v_job) or v_job.external_url !~ '^https://' then
    return null;
  end if;
  insert into public.external_apply_clicks (job_id, user_id) values (p_job_id, (select auth.uid()));
  return v_job.external_url;
end;
$$;

revoke execute on function public.record_external_click(uuid) from public;
grant execute on function public.record_external_click(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin: empresas sin reclamar
-- ---------------------------------------------------------------------------

-- Devuelve la empresa del dominio si ya existe; si no, crea una sin reclamar.
create function public.admin_upsert_unclaimed_company(p_name text, p_website_url text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text := nullif(trim(p_website_url), '');
  v_domain text := public.domain_from_url(v_url);
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  if v_url is not null and v_url !~ '^https://' then
    raise exception 'invalid_url' using errcode = 'P0001';
  end if;

  if v_domain is not null then
    select id into v_id from public.companies where domain = v_domain;
  else
    select id into v_id from public.companies where lower(name) = lower(trim(p_name)) and status = 'unclaimed' limit 1;
  end if;
  if v_id is not null then
    return v_id;
  end if;

  insert into public.companies (slug, name, domain, website_url, status, created_by)
  values (public.random_slug(p_name), trim(p_name), v_domain, v_url, 'unclaimed', (select auth.uid()))
  returning id into v_id;
  perform public.write_audit_log('company.imported', 'company', v_id::text, '{}'::jsonb);
  return v_id;
end;
$$;

create function public.admin_unclaimed_companies()
returns table (id uuid, name text, domain text, slug text, jobs bigint, clicks bigint)
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
    select c.id, c.name, c.domain::text, c.slug::text,
           (select count(*) from public.jobs j where j.company_id = c.id),
           (select count(*) from public.external_apply_clicks k join public.jobs j on j.id = k.job_id where j.company_id = c.id)
    from public.companies c
    where c.status = 'unclaimed'
    order by 6 desc, c.created_at desc
    limit 100;
end;
$$;

-- Le entrega una empresa sin reclamar a una cuenta nueva (sin rol) con ese email.
create function public.admin_transfer_company(p_company_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.companies where id = p_company_id and status = 'unclaimed') then
    raise exception 'not_unclaimed' using errcode = 'P0001';
  end if;
  select id into v_user_id from auth.users where lower(email) = lower(trim(p_email)) and email_confirmed_at is not null;
  if v_user_id is null then
    raise exception 'user_not_found' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.profiles where id = v_user_id) then
    raise exception 'already_onboarded' using errcode = 'P0001';
  end if;

  insert into public.profiles (id, role) values (v_user_id, 'recruiter');
  insert into public.company_members (company_id, user_id, member_role) values (p_company_id, v_user_id, 'owner');
  update public.companies
  set status = 'active',
      verified_at = case when public.email_matches_domain(p_email, domain) then now() end
  where id = p_company_id;
  perform public.write_audit_log('company.transferred', 'company', p_company_id::text, jsonb_build_object('user_id', v_user_id));
end;
$$;

revoke execute on function public.admin_upsert_unclaimed_company(text, text) from public, anon;
revoke execute on function public.admin_unclaimed_companies() from public, anon;
revoke execute on function public.admin_transfer_company(uuid, text) from public, anon;
grant execute on function public.admin_upsert_unclaimed_company(text, text) to authenticated;
grant execute on function public.admin_unclaimed_companies() to authenticated;
grant execute on function public.admin_transfer_company(uuid, text) to authenticated;
