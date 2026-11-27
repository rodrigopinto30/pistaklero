-- Página de empresa: stack tecnológico, cambio de sitio web (con verificación) y logo.

-- El límite de filas ahora acepta la columna dueña como segundo argumento (por defecto candidate_id).
create or replace function public.enforce_row_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_limit int := tg_argv[0]::int;
  v_column text := coalesce(tg_argv[1], 'candidate_id');
  v_owner text := to_jsonb(new) ->> v_column;
  v_count int;
begin
  execute format('select count(*) from %I.%I where %I::text = $1', tg_table_schema, tg_table_name, v_column)
    into v_count using v_owner;
  if v_count >= v_limit then
    raise exception 'limit_reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Stack tecnológico
-- ---------------------------------------------------------------------------

create table public.company_skills (
  company_id uuid not null references public.companies (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  primary key (company_id, skill_id)
);

create trigger company_skills_limit before insert on public.company_skills
  for each row execute function public.enforce_row_limit('20', 'company_id');

alter table public.company_skills enable row level security;
revoke all on public.company_skills from anon, authenticated;
grant select on public.company_skills to anon, authenticated;
grant insert, delete on public.company_skills to authenticated;

create policy "company_skills: los ve cualquiera" on public.company_skills
  for select to anon, authenticated using (true);
create policy "company_skills: los agregan los miembros" on public.company_skills
  for insert to authenticated with check (company_id = (select public.my_company_id()));
create policy "company_skills: los quitan los miembros" on public.company_skills
  for delete to authenticated using (company_id = (select public.my_company_id()));

-- ---------------------------------------------------------------------------
-- Sitio web: cambiarlo recalcula el dominio y la verificación
-- ---------------------------------------------------------------------------

revoke update (website_url, logo_path) on public.companies from authenticated;

create function public.update_company_website(p_website_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid := public.my_company_id();
  v_url text := nullif(trim(p_website_url), '');
  v_domain text := public.domain_from_url(v_url);
  v_previous_domain text;
  v_email text;
  v_email_confirmed boolean;
begin
  if v_company_id is null then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  if v_url is not null and v_url !~ '^https://' then
    raise exception 'invalid_url' using errcode = 'P0001';
  end if;
  if v_domain is not null and exists (select 1 from public.companies where domain = v_domain and id <> v_company_id) then
    raise exception 'company_exists' using errcode = 'P0001';
  end if;

  select domain into v_previous_domain from public.companies where id = v_company_id;
  select u.email, u.email_confirmed_at is not null into v_email, v_email_confirmed
  from auth.users u where u.id = (select auth.uid());

  update public.companies
  set website_url = v_url,
      domain = v_domain,
      verified_at = case
        when v_domain is not distinct from v_previous_domain then verified_at
        when v_email_confirmed and public.email_matches_domain(v_email, v_domain) then now()
        else null
      end
  where id = v_company_id;

  if v_domain is distinct from v_previous_domain then
    perform public.write_audit_log('company.domain_changed', 'company', v_company_id::text,
      jsonb_build_object('from', v_previous_domain, 'to', v_domain));
  end if;
end;
$$;

revoke execute on function public.update_company_website(text) from public, anon;
grant execute on function public.update_company_website(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Logo: el servidor sube la imagen ya recodificada y después la asigna con esta función
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('company-logos', 'company-logos', true, 262144, array['image/webp']);
-- Sin políticas de escritura sobre storage.objects: ningún cliente puede subir, solo el servidor.

create function public.set_company_logo(p_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid := public.my_company_id();
  -- Texto vacío = quitar el logo.
  v_path text := nullif(trim(p_path), '');
begin
  if v_company_id is null then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  -- Solo rutas dentro de la carpeta de la propia empresa: "<company_id>/<32 hex>.webp".
  if v_path is not null and v_path !~ ('^' || v_company_id::text || '/[0-9a-f]{32}\.webp$') then
    raise exception 'invalid_path' using errcode = 'P0001';
  end if;
  update public.companies set logo_path = v_path where id = v_company_id;
end;
$$;

revoke execute on function public.set_company_logo(text) from public, anon;
grant execute on function public.set_company_logo(text) to authenticated;
