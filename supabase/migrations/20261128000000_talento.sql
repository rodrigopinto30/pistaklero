-- Pestaña "Talento": las empresas exploran candidatas y candidatos con filtros.
-- Respeta la privacidad que eligió cada persona (no aparecen los perfiles ocultos) y los bloqueos. Solo para cuentas de empresa (y el admin). Ver la tarjeta no cuenta como
-- visita al perfil: eso pasa recién al abrirlo (y sigue el límite diario de vistas).

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
  availability public.availability, skills jsonb, total_count bigint
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
         count(*) over ()
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
