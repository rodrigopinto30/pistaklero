-- Etiquetas en las publicaciones (#ia, #python, #entrevistas…), como en dev.to: se escriben al
-- publicar, se ven en la tarjeta y llevan al listado filtrado por esa etiqueta.

-- Una etiqueta: minúsculas, sin el "#", letras (con tildes y ñ), números y + # . _ - (para "c++", "c#", "node.js").
create function public.normalize_post_tag(p_tag text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(left(regexp_replace(lower(trim(p_tag)), '^#+', ''), 30), '');
$$;

create function public.valid_post_tags(p_tags text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(p_tags) <= 30
    and not exists (select 1 from unnest(p_tags) t where t !~ '^[a-z0-9áéíóúüñç+#._-]{1,30}$' or t <> lower(t));
$$;

/* Limpia lo que escribió la persona: sin "#", sin repetidas ni vacías, hasta 30. */
create function public.clean_post_tags(p_tags text[])
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(tag order by first_seen), '{}')
  from (
    select tag, min(ord) as first_seen
    from unnest(coalesce(p_tags, '{}')) with ordinality as x(raw, ord)
    cross join lateral (select public.normalize_post_tag(raw) as tag) n
    where tag is not null and tag ~ '^[a-z0-9áéíóúüñç+#._-]{1,30}$'
    group by tag
    order by min(ord)
    limit 30
  ) t;
$$;

alter table public.posts add column tags text[] not null default '{}' check (public.valid_post_tags(tags));
create index posts_tags_idx on public.posts using gin (tags);

-- Publicar y editar, ahora con etiquetas (cambia la firma: se reemplazan).
drop function public.create_post(text, text, public.app_locale);
drop function public.update_post(uuid, text, text, public.app_locale);

create function public.create_post(p_title text, p_body text, p_language public.app_locale, p_tags text[] default '{}')
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_slug text;
begin
  if public.auth_role() is null then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.people where user_id = v_uid) then
    raise exception 'no_person' using errcode = 'P0001';
  end if;
  -- Contra el spam: hasta 5 publicaciones por día.
  if (select count(*) from public.posts where author_id = v_uid and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  v_slug := public.random_slug(p_title);
  insert into public.posts (author_id, slug, title, body, language, tags)
  values (v_uid, v_slug, trim(p_title), trim(p_body), p_language, public.clean_post_tags(p_tags));
  return v_slug;
end;
$$;

create function public.update_post(p_post_id uuid, p_title text, p_body text, p_language public.app_locale, p_tags text[] default '{}')
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.posts
  set title = trim(p_title), body = trim(p_body), language = p_language, tags = public.clean_post_tags(p_tags)
  where id = p_post_id
    and author_id = (select auth.uid())
    and not public.is_suspended(author_id);
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function public.create_post(text, text, public.app_locale, text[]) from public, anon;
revoke execute on function public.update_post(uuid, text, text, public.app_locale, text[]) from public, anon;
grant execute on function public.create_post(text, text, public.app_locale, text[]) to authenticated;
grant execute on function public.update_post(uuid, text, text, public.app_locale, text[]) to authenticated;

-- Las tarjetas traen las etiquetas y se pueden filtrar por una (p_tag).
drop function public.post_cards(text, uuid, uuid, boolean, uuid, int, int);

create function public.post_cards(
  p_query text default null,
  p_author_id uuid default null,
  p_company_id uuid default null,
  p_saved_only boolean default false,
  p_post_id uuid default null,
  p_limit int default 24,
  p_offset int default 0,
  p_tag text default null
)
returns table (
  id uuid, slug text, title text, excerpt text, language public.app_locale, created_at timestamptz,
  likes_count int, author_name text, author_avatar text, author_role public.user_role,
  author_profile_slug text, author_company_name text, author_company_slug text,
  liked boolean, saved boolean, total_count bigint, tags text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  with q as (select public.like_needle(p_query) as needle)
  select p.id, p.slug::text, p.title, p.excerpt, p.language, p.created_at, p.likes_count,
         pe.full_name, pe.avatar_path, pr.role,
         case when pr.role = 'candidate' and public.can_view_candidate(p.author_id)
              then (select c.slug::text from public.candidates c where c.user_id = p.author_id) end,
         co.name, co.slug::text,
         exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = (select auth.uid())),
         exists (select 1 from public.saved_posts s where s.post_id = p.id and s.user_id = (select auth.uid())),
         count(*) over (),
         p.tags
  from public.posts p
  join public.people pe on pe.user_id = p.author_id
  join public.profiles pr on pr.id = p.author_id
  left join public.company_members m on m.user_id = p.author_id and pr.role = 'recruiter'
  left join public.companies co on co.id = m.company_id and co.status <> 'suspended'
  cross join q
  where p.status = 'published'
    and pr.suspended_at is null
    and (p_post_id is null or p.id = p_post_id)
    and (p_author_id is null or p.author_id = p_author_id)
    and (p_company_id is null or m.company_id = p_company_id)
    and (not p_saved_only or exists (select 1 from public.saved_posts s where s.post_id = p.id and s.user_id = (select auth.uid())))
    and (p_tag is null or p.tags @> array[public.normalize_post_tag(p_tag)])
    and (q.needle is null
         or lower(extensions.unaccent(p.title)) like '%' || q.needle || '%'
         or lower(extensions.unaccent(p.body)) like '%' || q.needle || '%'
         or exists (select 1 from unnest(p.tags) t where lower(extensions.unaccent(t)) like q.needle || '%'))
  order by p.created_at desc, p.id
  limit least(greatest(p_limit, 1), 60)
  offset greatest(p_offset, 0);
$$;

grant execute on function public.post_cards(text, uuid, uuid, boolean, uuid, int, int, text) to anon, authenticated;
