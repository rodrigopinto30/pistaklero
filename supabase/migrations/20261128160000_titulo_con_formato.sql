-- El título de una publicación con formato: negrita, cursiva, subrayado, tachado, color y resaltado
-- (lo arma el editor visual, igual que el cuerpo). Se guarda en Markdown con las mismas etiquetas
-- seguras; el sitio lo limpia al mostrarlo.
--
-- Donde hace falta el texto solo (el slug, la búsqueda, los avisos) se usa title_plain: el título
-- sin formato, que la base calcula sola.

/**
 * Un texto de una línea con formato, sin el formato: sin etiquetas, sin los símbolos de
 * negrita/cursiva/tachado y con los caracteres escapados tal cual ("5\*3" → "5*3"). Es lo mismo que
 * plainInline() en src/lib/editor/text.ts.
 */
create function public.plain_inline(p_text text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select btrim(regexp_replace(
    replace(replace(replace(replace(replace(replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(coalesce(p_text, ''), '<[^>]+>', '', 'g'),        -- etiquetas
          '(^|[^\\*_~`])[*_~`]+', '\1', 'g'),                             -- símbolos de formato (no escapados)
        '\\([\\`*_{}\[\]()#+\-.!~<>|])', '\1', 'g'),                       -- caracteres escapados
      '&lt;', '<'), '&gt;', '>'), '&quot;', '"'), '&#39;', ''''), '&nbsp;', ' '), '&amp;', '&'),
    '\s+', ' ', 'g'));
$$;

-- Los topes cuentan las etiquetas: el título puede ocupar hasta el triple (el límite de lo que se
-- lee, 5 a 120 caracteres, lo controla la aplicación).
alter table public.posts drop constraint posts_title_check;
alter table public.posts add constraint posts_title_check check (char_length(title) between 5 and 360);

alter table public.posts add column title_plain text generated always as (public.plain_inline(title)) stored;

-- El slug sale del título sin formato.
create or replace function public.create_post(p_title text, p_body text, p_language public.app_locale, p_tags text[] default '{}')
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

  v_slug := public.random_slug(public.plain_inline(p_title));
  insert into public.posts (author_id, slug, title, body, language, tags)
  values (v_uid, v_slug, trim(p_title), trim(p_body), p_language, public.clean_post_tags(p_tags));
  return v_slug;
end;
$$;

-- La búsqueda mira el título sin formato (si no, "**hola** mundo" no aparecía buscando "hola mundo").
create or replace function public.post_cards(
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
         or lower(extensions.unaccent(p.title_plain)) like '%' || q.needle || '%'
         or lower(extensions.unaccent(p.body)) like '%' || q.needle || '%'
         or exists (select 1 from unnest(p.tags) t where lower(extensions.unaccent(t)) like q.needle || '%'))
  order by p.created_at desc, p.id
  limit least(greatest(p_limit, 1), 60)
  offset greatest(p_offset, 0);
$$;

-- El aviso de "me gusta" nombra la publicación con el título sin formato.
create or replace function public.notify_post_liked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post record;
begin
  select p.id, p.title_plain as title, p.slug::text as slug, p.author_id into v_post from public.posts p where p.id = new.post_id;
  if v_post.author_id is distinct from new.user_id then
    perform public.notify(v_post.author_id, 'post_liked',
      jsonb_build_object('post_title', v_post.title, 'post_slug', v_post.slug), 'post:' || v_post.id::text);
  end if;
  return new;
end;
$$;
