-- Página de empresa: portada (imagen de fondo de su tarjeta y de su página) y sus empleos abiertos.

alter table public.companies
  add column cover_path text check (cover_path ~ '^[0-9a-f-]{36}/[0-9a-f]{32}\.webp$');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('company-covers', 'company-covers', true, 1048576, array['image/webp']);
-- Sin políticas de escritura sobre storage.objects: ningún cliente puede subir, solo el servidor.

-- El servidor sube la portada ya recodificada y después la asigna con esta función (como el logo).
create function public.set_company_cover(p_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid := public.my_company_id();
  -- Texto vacío = quitar la portada.
  v_path text := nullif(trim(p_path), '');
begin
  if v_company_id is null then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  if v_path is not null and v_path !~ ('^' || v_company_id::text || '/[0-9a-f]{32}\.webp$') then
    raise exception 'invalid_path' using errcode = 'P0001';
  end if;
  update public.companies set cover_path = v_path where id = v_company_id;
end;
$$;

revoke execute on function public.set_company_cover(text) from public, anon;
grant execute on function public.set_company_cover(text) to authenticated;

-- Empleos abiertos de una empresa, con las mismas columnas que la búsqueda (misma tarjeta).
create function public.company_job_cards(p_company_id uuid)
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
  order by j.published_at desc
  limit 100;
$$;

grant execute on function public.company_job_cards(uuid) to anon, authenticated;
