-- La empresa guarda perfiles de candidatas y candidatos, como una persona guarda empresas. La lista es
-- del equipo (todas las personas de la empresa la ven, con quién guardó a cada una). Respeta la
-- privacidad: un perfil oculto o que bloqueó a la empresa deja de aparecer en la lista.

create table public.saved_candidates (
  company_id uuid not null references public.companies (id) on delete cascade,
  candidate_id uuid not null references public.candidates (user_id) on delete cascade,
  saved_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (company_id, candidate_id)
);

create index saved_candidates_company_idx on public.saved_candidates (company_id, created_at desc);

alter table public.saved_candidates enable row level security;
revoke all on public.saved_candidates from anon, authenticated;

/** ¿La empresa puede ver la tarjeta de esta persona? (perfil no oculto y sin bloqueo). */
create function public.candidate_card_visible(p_candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.candidates c
    join public.profiles pr on pr.id = c.user_id and pr.suspended_at is null
    where c.user_id = p_candidate_id
      and c.visibility <> 'hidden'
      and (c.visibility = 'public' or public.my_company_id() is not null)
      and not exists (
        select 1 from public.candidate_blocked_companies b
        where b.candidate_id = c.user_id and b.company_id = public.my_company_id()
      )
  );
$$;

-- Guardar o dejar de guardar (devuelve si quedó guardado).
create function public.toggle_saved_candidate(p_candidate_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company uuid := public.my_company_id();
begin
  if v_company is null then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  delete from public.saved_candidates where company_id = v_company and candidate_id = p_candidate_id;
  if found then
    return false;
  end if;
  if not public.candidate_card_visible(p_candidate_id) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  insert into public.saved_candidates (company_id, candidate_id, saved_by) values (v_company, p_candidate_id, (select auth.uid()));
  return true;
end;
$$;

create function public.is_candidate_saved(p_candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.saved_candidates where company_id = public.my_company_id() and candidate_id = p_candidate_id);
$$;

-- La lista del equipo, con quién guardó a cada persona.
create function public.saved_candidate_cards()
returns table (
  user_id uuid, slug text, full_name text, avatar_path text, headline text, city text, country text,
  availability public.availability, skills jsonb, saved_at timestamptz, saved_by_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.user_id, c.slug::text, pe.full_name, pe.avatar_path, c.headline, c.city, c.country, c.availability,
         coalesce((
           select jsonb_agg(jsonb_build_object('slug', s.slug, 'es', s.name_es, 'en', s.name_en) order by cs.level desc, s.slug)
           from (select cs2.* from public.candidate_skills cs2 where cs2.candidate_id = c.user_id order by cs2.level desc limit 4) cs
           join public.skills s on s.id = cs.skill_id
         ), '[]'::jsonb),
         sc.created_at,
         saver.full_name
  from public.saved_candidates sc
  join public.candidates c on c.user_id = sc.candidate_id
  join public.people pe on pe.user_id = c.user_id
  left join public.people saver on saver.user_id = sc.saved_by
  where sc.company_id = public.my_company_id()
    and public.candidate_card_visible(c.user_id)
  order by sc.created_at desc
  limit 200;
$$;

revoke execute on function public.candidate_card_visible(uuid) from public, anon;
revoke execute on function public.toggle_saved_candidate(uuid) from public, anon;
revoke execute on function public.is_candidate_saved(uuid) from public, anon;
revoke execute on function public.saved_candidate_cards() from public, anon;
grant execute on function public.candidate_card_visible(uuid) to authenticated;
grant execute on function public.toggle_saved_candidate(uuid) to authenticated;
grant execute on function public.is_candidate_saved(uuid) to authenticated;
grant execute on function public.saved_candidate_cards() to authenticated;

-- Talento: cada tarjeta dice si la empresa ya la guardó.
drop function public.talent_cards(text, text, text, public.availability, int, int);

create function public.talent_cards(
  p_query text default null,
  p_skill text default null,
  p_country text default null,
  p_availability public.availability default null,
  p_limit int default 24,
  p_offset int default 0
)
returns table (
  user_id uuid, slug text, full_name text, avatar_path text, headline text, city text, country text,
  availability public.availability, skills jsonb, total_count bigint, saved boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if public.auth_role() is distinct from 'recruiter' and not public.is_admin() then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  return query
  with q as (select public.like_needle(p_query) as needle)
  select c.user_id, c.slug::text, pe.full_name, pe.avatar_path, c.headline, c.city, c.country, c.availability,
         coalesce((
           select jsonb_agg(jsonb_build_object('slug', s.slug, 'es', s.name_es, 'en', s.name_en) order by cs.level desc, s.slug)
           from (select cs2.* from public.candidate_skills cs2 where cs2.candidate_id = c.user_id
                 order by cs2.level desc limit 4) cs
           join public.skills s on s.id = cs.skill_id
         ), '[]'::jsonb),
         count(*) over (),
         exists (select 1 from public.saved_candidates sc where sc.company_id = public.my_company_id() and sc.candidate_id = c.user_id)
  from public.candidates c
  join public.people pe on pe.user_id = c.user_id
  join public.profiles pr on pr.id = c.user_id and pr.suspended_at is null
  cross join q
  -- La tarjeta (nombre, titular, ciudad, habilidades) se ve si el perfil es público o "solo
  -- empresas"; el perfil completo, al abrirlo, sigue las reglas de can_view_candidate (y suma al
  -- límite diario de vistas). Los bloqueos valen también acá.
  where c.visibility <> 'hidden'
    and (c.visibility = 'public' or public.my_company_id() is not null or public.is_admin())
    and not exists (
      select 1 from public.candidate_blocked_companies b
      where b.candidate_id = c.user_id and b.company_id = public.my_company_id())
    and (p_country is null or c.country = p_country)
    and (p_availability is null or c.availability = p_availability)
    and (p_skill is null or exists (
      select 1 from public.candidate_skills cs join public.skills s on s.id = cs.skill_id
      where cs.candidate_id = c.user_id and s.slug = p_skill))
    and (q.needle is null
         or lower(extensions.unaccent(pe.full_name)) like '%' || q.needle || '%'
         or lower(extensions.unaccent(c.headline)) like '%' || q.needle || '%'
         or exists (select 1 from public.candidate_skills cs join public.skills s on s.id = cs.skill_id
                    where cs.candidate_id = c.user_id
                      and (lower(extensions.unaccent(s.name_es)) like q.needle || '%' or lower(s.slug::text) like q.needle || '%')))
  -- Primero quienes buscan trabajo, después lo más reciente.
  order by (c.availability = 'not_looking'), c.updated_at desc, c.user_id
  limit least(greatest(p_limit, 1), 60)
  offset greatest(p_offset, 0);
end;
$$;

revoke execute on function public.talent_cards(text, text, text, public.availability, int, int) from public, anon;
grant execute on function public.talent_cards(text, text, text, public.availability, int, int) to authenticated;
