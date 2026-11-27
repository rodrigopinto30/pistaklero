-- Reclamo automático de empresas sin reclamar: quien se registra con un email verificado del mismo dominio
-- que una empresa importada se queda con su página (y sus ofertas) como owner, sin pasar por el admin.

create or replace function public.create_company(p_company_name text, p_website_url text, p_locale public.app_locale)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_email_confirmed boolean;
  v_domain text := public.domain_from_url(p_website_url);
  v_existing public.companies%rowtype;
  v_company_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'already_onboarded' using errcode = 'P0001';
  end if;

  select u.email, u.email_confirmed_at is not null into v_email, v_email_confirmed
  from auth.users u where u.id = v_uid;

  if v_domain is not null then
    select * into v_existing from public.companies where domain = v_domain for update;
    if found then
      -- Solo una empresa sin reclamar se puede reclamar, y solo con un email verificado de su dominio.
      if v_existing.status <> 'unclaimed' then
        raise exception 'company_exists' using errcode = 'P0001';
      end if;
      if not (v_email_confirmed and public.email_matches_domain(v_email, v_domain)) then
        raise exception 'company_unclaimed' using errcode = 'P0001';
      end if;

      insert into public.profiles (id, role, locale) values (v_uid, 'recruiter', p_locale);
      insert into public.company_members (company_id, user_id, member_role) values (v_existing.id, v_uid, 'owner');
      update public.companies
      set status = 'active',
          verified_at = now(),
          website_url = coalesce(website_url, nullif(trim(p_website_url), ''))
      where id = v_existing.id;
      perform public.write_audit_log('company.claimed', 'company', v_existing.id::text, jsonb_build_object('user_id', v_uid));
      return v_existing.id;
    end if;
  end if;

  insert into public.profiles (id, role, locale) values (v_uid, 'recruiter', p_locale);

  insert into public.companies (slug, name, domain, website_url, verified_at, created_by)
  values (
    public.random_slug(p_company_name),
    trim(p_company_name),
    v_domain,
    nullif(trim(p_website_url), ''),
    case when v_email_confirmed and public.email_matches_domain(v_email, v_domain) then now() end,
    v_uid
  )
  returning id into v_company_id;

  insert into public.company_members (company_id, user_id, member_role)
  values (v_company_id, v_uid, 'owner');

  perform public.write_audit_log('company.created', 'company', v_company_id::text,
    jsonb_build_object('verified', exists (select 1 from public.companies where id = v_company_id and verified_at is not null)));

  return v_company_id;
end;
$$;
