-- Rendimiento de los perfiles con muchos candidatos.
--
-- Problema: buscar un perfil por su slug (citext) obligaba a evaluar can_view_candidate en TODAS las filas:
-- la igualdad de citext no es "leakproof", así que Postgres aplica la política de RLS antes que el filtro.
-- Con algunos miles de candidatos, la consulta de un visitante pasaba los 3 s (statement_timeout de anon)
-- y la página pública daba 404.
--
-- Solución:
-- 1. visible_candidate_id: resuelve el slug con el índice y devuelve el id solo si quien mira puede verlo.
--    La página después pide la fila por user_id (igualdad de uuid: leakproof, usa el índice).
-- 2. Las políticas resuelven primero lo barato y solo llaman a can_view_candidate con sesión iniciada.
--    Un visitante sin sesión ve los perfiles públicos (el bloqueo de empresas no le aplica); con sesión
--    decide siempre can_view_candidate, porque una empresa bloqueada no ve ni un perfil público.

create function public.visible_candidate_id(p_slug text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.user_id
  from public.candidates c
  where c.slug = p_slug
    and public.can_view_candidate(c.user_id);
$$;

revoke execute on function public.visible_candidate_id(text) from public;
grant execute on function public.visible_candidate_id(text) to anon, authenticated;

drop policy "candidates: según la visibilidad del perfil" on public.candidates;
create policy "candidates: según la visibilidad del perfil"
  on public.candidates for select
  to anon, authenticated
  using (
    ((select auth.uid()) is null and visibility = 'public')
    or user_id = (select auth.uid())
    or ((select auth.uid()) is not null and public.can_view_candidate(user_id))
  );

drop policy "people: cada uno, el admin, quien puede ver el perfil y los autores de publicaciones" on public.people;
create policy "people: cada uno, el admin, quien puede ver el perfil y los autores de publicaciones"
  on public.people for select
  to anon, authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_admin())
    or exists (select 1 from public.candidates c where c.user_id = people.user_id and c.visibility = 'public')
    or ((select auth.uid()) is not null and public.can_view_candidate(user_id))
    or exists (select 1 from public.posts p where p.author_id = people.user_id and p.status = 'published')
  );
