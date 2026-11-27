-- Publicaciones: consejos para conseguir trabajo, escritos por cualquier persona (candidatos o reclutadores).
-- Se publican al instante; la comunidad las denuncia (3 denuncias las ocultan) y el admin decide.
-- Like y guardar, con contadores mantenidos por la base.

create type public.post_status as enum ('published', 'hidden');
create type public.post_report_reason as enum ('spam', 'offensive', 'scam', 'other');

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.people (user_id) on delete cascade,
  slug extensions.citext not null unique,
  title text not null check (char_length(title) between 5 and 120),
  body text not null check (char_length(body) between 20 and 5000),
  -- Resumen para las tarjetas: el texto sin marcas de Markdown, hasta 280 caracteres.
  excerpt text generated always as (
    left(trim(regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(body, '\[([^\]]*)\]\([^)]*\)', '\1', 'g'),  -- [texto](url) → texto
          '(^|\n)\s*([-+*]|\d+\.)\s+', '\1', 'g'),              -- viñetas de listas
        '[#*_>`~|]+', '', 'g'),                                  -- títulos y énfasis
      '\s+', ' ', 'g')), 280)
  ) stored,
  language public.app_locale not null default 'es',
  status public.post_status not null default 'published',
  likes_count int not null default 0 check (likes_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_published_idx on public.posts (created_at desc) where status = 'published';
create index posts_author_idx on public.posts (author_id, created_at desc);

create trigger posts_updated_at before update on public.posts
  for each row execute function public.set_updated_at();

-- ¿La cuenta está suspendida? (para no mostrar lo que publicó). Definer: profiles solo se ve a sí mismo.
create function public.is_suspended(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = p_user_id and suspended_at is not null);
$$;

revoke execute on function public.is_suspended(uuid) from public;
grant execute on function public.is_suspended(uuid) to anon, authenticated;

alter table public.posts enable row level security;
revoke all on public.posts from anon, authenticated;
grant select on public.posts to anon, authenticated;

create policy "posts: publicadas para todos; las propias y el admin ven todas"
  on public.posts for select
  to anon, authenticated
  using (
    (status = 'published' and not public.is_suspended(author_id))
    or author_id = (select auth.uid())
    or (select public.is_admin())
  );

-- Quien publica muestra su nombre y su foto con la publicación.
drop policy "people: cada uno, el admin y quien puede ver el perfil" on public.people;
create policy "people: cada uno, el admin, quien puede ver el perfil y los autores de publicaciones"
  on public.people for select
  to anon, authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_admin())
    or public.can_view_candidate(user_id)
    or exists (select 1 from public.posts p where p.author_id = user_id and p.status = 'published')
  );

-- ---------------------------------------------------------------------------
-- Escribir, editar y borrar (solo con estas funciones: validan y limitan).
-- ---------------------------------------------------------------------------

create function public.create_post(p_title text, p_body text, p_language public.app_locale)
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
  insert into public.posts (author_id, slug, title, body, language)
  values (v_uid, v_slug, trim(p_title), trim(p_body), p_language);
  return v_slug;
end;
$$;

create function public.update_post(p_post_id uuid, p_title text, p_body text, p_language public.app_locale)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.posts
  set title = trim(p_title), body = trim(p_body), language = p_language
  where id = p_post_id
    and author_id = (select auth.uid())
    and not public.is_suspended(author_id);
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
end;
$$;

-- La borra quien la escribió o el admin.
create function public.delete_post(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.posts
  where id = p_post_id
    and (author_id = (select auth.uid()) or public.is_admin());
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if public.is_admin() then
    perform public.write_audit_log('post.deleted', 'post', p_post_id::text);
  end if;
end;
$$;

revoke execute on function public.create_post(text, text, public.app_locale) from public, anon;
revoke execute on function public.update_post(uuid, text, text, public.app_locale) from public, anon;
revoke execute on function public.delete_post(uuid) from public, anon;
grant execute on function public.create_post(text, text, public.app_locale) to authenticated;
grant execute on function public.update_post(uuid, text, text, public.app_locale) to authenticated;
grant execute on function public.delete_post(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Likes y guardados
-- ---------------------------------------------------------------------------

create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.saved_posts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index saved_posts_user_idx on public.saved_posts (user_id, created_at desc);

alter table public.post_likes enable row level security;
alter table public.saved_posts enable row level security;
revoke all on public.post_likes from anon, authenticated;
revoke all on public.saved_posts from anon, authenticated;
grant select on public.post_likes to authenticated;
grant select on public.saved_posts to authenticated;

create policy "post_likes: cada uno ve los suyos" on public.post_likes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "saved_posts: cada uno ve los suyos" on public.saved_posts
  for select to authenticated using (user_id = (select auth.uid()));

-- El contador de likes lo lleva la base (nadie lo puede escribir a mano).
create function public.post_likes_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set likes_count = likes_count + 1 where id = new.post_id;
  else
    update public.posts set likes_count = greatest(likes_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger post_likes_count after insert or delete on public.post_likes
  for each row execute function public.post_likes_count();

-- Like / guardar: tocar de nuevo deshace. Devuelven el estado final.
create function public.toggle_post_like(p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if public.auth_role() is null then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  delete from public.post_likes where post_id = p_post_id and user_id = v_uid;
  if found then
    return false;
  end if;
  if not exists (select 1 from public.posts where id = p_post_id and status = 'published') then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  insert into public.post_likes (post_id, user_id) values (p_post_id, v_uid);
  return true;
end;
$$;

create function public.toggle_saved_post(p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if public.auth_role() is null then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  delete from public.saved_posts where post_id = p_post_id and user_id = v_uid;
  if found then
    return false;
  end if;
  if not exists (select 1 from public.posts where id = p_post_id and status = 'published') then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if (select count(*) from public.saved_posts where user_id = v_uid) >= 500 then
    raise exception 'limit_reached' using errcode = 'P0001';
  end if;
  insert into public.saved_posts (user_id, post_id) values (v_uid, p_post_id);
  return true;
end;
$$;

revoke execute on function public.toggle_post_like(uuid) from public, anon;
revoke execute on function public.toggle_saved_post(uuid) from public, anon;
grant execute on function public.toggle_post_like(uuid) to authenticated;
grant execute on function public.toggle_saved_post(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Denuncias: 3 cuentas distintas la ocultan hasta que el admin la revise.
-- ---------------------------------------------------------------------------

create table public.post_reports (
  post_id uuid not null references public.posts (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason public.post_report_reason not null,
  created_at timestamptz not null default now(),
  primary key (post_id, reporter_id)
);

alter table public.post_reports enable row level security;
revoke all on public.post_reports from anon, authenticated;
grant select on public.post_reports to authenticated;
create policy "post_reports: cada uno ve las suyas y el admin todas" on public.post_reports
  for select to authenticated using (reporter_id = (select auth.uid()) or (select public.is_admin()));

create function public.report_post(p_post_id uuid, p_reason public.post_report_reason)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if public.auth_role() is null then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.posts where id = p_post_id and status = 'published' and author_id <> v_uid) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  insert into public.post_reports (post_id, reporter_id, reason) values (p_post_id, v_uid, p_reason)
  on conflict (post_id, reporter_id) do nothing;
  if (select count(*) from public.post_reports where post_id = p_post_id) >= 3 then
    update public.posts set status = 'hidden' where id = p_post_id and status = 'published';
  end if;
end;
$$;

-- El admin vuelve a publicar una oculta (descarta las denuncias) o la deja oculta.
create function public.admin_restore_post(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  delete from public.post_reports where post_id = p_post_id;
  update public.posts set status = 'published' where id = p_post_id;
  perform public.write_audit_log('post.restored', 'post', p_post_id::text);
end;
$$;

revoke execute on function public.report_post(uuid, public.post_report_reason) from public, anon;
revoke execute on function public.admin_restore_post(uuid) from public, anon;
grant execute on function public.report_post(uuid, public.post_report_reason) to authenticated;
grant execute on function public.admin_restore_post(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Tarjetas: lo publicado con su autor (nombre, foto y adónde lleva su nombre) y si ya le diste like o la guardaste.
-- Es definer para leer la empresa del reclutador, pero solo devuelve datos públicos de publicaciones públicas.
-- ---------------------------------------------------------------------------

create function public.post_cards(
  p_query text default null,
  p_author_id uuid default null,
  p_company_id uuid default null,
  p_saved_only boolean default false,
  p_post_id uuid default null,
  p_limit int default 24,
  p_offset int default 0
)
returns table (
  id uuid, slug text, title text, excerpt text, language public.app_locale, created_at timestamptz,
  likes_count int, author_name text, author_avatar text, author_role public.user_role,
  author_profile_slug text, author_company_name text, author_company_slug text,
  liked boolean, saved boolean, total_count bigint
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
         count(*) over ()
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
    and (q.needle is null
         or lower(extensions.unaccent(p.title)) like '%' || q.needle || '%'
         or lower(extensions.unaccent(p.body)) like '%' || q.needle || '%')
  order by p.created_at desc
  limit least(greatest(p_limit, 1), 60)
  offset greatest(p_offset, 0);
$$;

grant execute on function public.post_cards(text, uuid, uuid, boolean, uuid, int, int) to anon, authenticated;

-- La exportación de datos suma las publicaciones y las guardadas.
create or replace function public.export_my_data()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'account', (select jsonb_build_object('id', u.id, 'email', u.email, 'created_at', u.created_at)
                from auth.users u where u.id = (select auth.uid())),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = (select auth.uid())),
    'person', (select jsonb_build_object('first_name', pe.first_name, 'middle_name', pe.middle_name, 'last_name', pe.last_name)
               from public.people pe where pe.user_id = (select auth.uid())),
    'candidate', (select to_jsonb(c) from public.candidates c where c.user_id = (select auth.uid())),
    'skills', coalesce((select jsonb_agg(jsonb_build_object('skill', s.slug, 'level', cs.level))
                        from public.candidate_skills cs join public.skills s on s.id = cs.skill_id
                        where cs.candidate_id = (select auth.uid())), '[]'::jsonb),
    'experiences', coalesce((select jsonb_agg(to_jsonb(e)) from public.candidate_experiences e where e.candidate_id = (select auth.uid())), '[]'::jsonb),
    'education', coalesce((select jsonb_agg(to_jsonb(e)) from public.candidate_education e where e.candidate_id = (select auth.uid())), '[]'::jsonb),
    'certifications', coalesce((select jsonb_agg(to_jsonb(e)) from public.candidate_certifications e where e.candidate_id = (select auth.uid())), '[]'::jsonb),
    'projects', coalesce((select jsonb_agg(to_jsonb(e)) from public.candidate_projects e where e.candidate_id = (select auth.uid())), '[]'::jsonb),
    'salary_expectation', (select to_jsonb(s) from public.candidate_salary_expectations s where s.candidate_id = (select auth.uid())),
    'blocked_companies', coalesce((select jsonb_agg(c.name) from public.candidate_blocked_companies b
                                   join public.companies c on c.id = b.company_id where b.candidate_id = (select auth.uid())), '[]'::jsonb),
    'applications', coalesce((select jsonb_agg(jsonb_build_object(
                                'job', j.title, 'company', co.name, 'status', a.status, 'applied_at', a.created_at,
                                'rejection_message', a.rejection_message,
                                'answers', (select jsonb_agg(jsonb_build_object('question', q.prompt, 'text', aa.answer_text, 'option', aa.answer_option))
                                            from public.application_answers aa join public.job_questions q on q.id = aa.question_id
                                            where aa.application_id = a.id),
                                'history', (select jsonb_agg(jsonb_build_object('status', ev.to_status, 'at', ev.created_at) order by ev.created_at)
                                            from public.application_events ev where ev.application_id = a.id)))
                              from public.applications a join public.jobs j on j.id = a.job_id join public.companies co on co.id = j.company_id
                              where a.candidate_id = (select auth.uid())), '[]'::jsonb),
    'company_membership', (select jsonb_build_object('company', c.name, 'role', m.member_role, 'since', m.created_at)
                           from public.company_members m join public.companies c on c.id = m.company_id
                           where m.user_id = (select auth.uid())),
    'saved_jobs', coalesce((select jsonb_agg(jsonb_build_object('job', j.title, 'saved_at', s.created_at))
                            from public.saved_jobs s join public.jobs j on j.id = s.job_id
                            where s.user_id = (select auth.uid())), '[]'::jsonb),
    'posts', coalesce((select jsonb_agg(jsonb_build_object('title', p.title, 'body', p.body, 'status', p.status, 'created_at', p.created_at))
                       from public.posts p where p.author_id = (select auth.uid())), '[]'::jsonb),
    'saved_posts', coalesce((select jsonb_agg(jsonb_build_object('post', p.title, 'saved_at', s.created_at))
                             from public.saved_posts s join public.posts p on p.id = s.post_id
                             where s.user_id = (select auth.uid())), '[]'::jsonb),
    'reports', coalesce((select jsonb_agg(jsonb_build_object('job_id', r.job_id, 'reason', r.reason, 'at', r.created_at))
                         from public.job_reports r where r.reporter_id = (select auth.uid())), '[]'::jsonb)
  );
$$;
