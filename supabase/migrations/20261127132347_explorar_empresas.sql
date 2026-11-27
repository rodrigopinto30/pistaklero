-- Explorar empresas: like y guardar (como las publicaciones), con el contador en la empresa.

alter table public.companies add column likes_count int not null default 0 check (likes_count >= 0);

create table public.company_likes (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create table public.saved_companies (
  user_id uuid not null references public.profiles (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, company_id)
);

create index saved_companies_user_idx on public.saved_companies (user_id, created_at desc);

alter table public.company_likes enable row level security;
alter table public.saved_companies enable row level security;
revoke all on public.company_likes from anon, authenticated;
revoke all on public.saved_companies from anon, authenticated;
grant select on public.company_likes to authenticated;
grant select on public.saved_companies to authenticated;

create policy "company_likes: cada uno ve los suyos" on public.company_likes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "saved_companies: cada uno ve las suyas" on public.saved_companies
  for select to authenticated using (user_id = (select auth.uid()));

-- El contador lo lleva la base. Es una columna del sistema: las empresas no la pueden editar
-- (no está entre las columnas con permiso de update).
create function public.company_likes_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.companies set likes_count = likes_count + 1 where id = new.company_id;
  else
    update public.companies set likes_count = greatest(likes_count - 1, 0) where id = old.company_id;
  end if;
  return null;
end;
$$;

create trigger company_likes_count after insert or delete on public.company_likes
  for each row execute function public.company_likes_count();

-- Una empresa se puede ver (y marcar) si no está suspendida.
create function public.toggle_company_like(p_company_id uuid)
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
  delete from public.company_likes where company_id = p_company_id and user_id = v_uid;
  if found then
    return false;
  end if;
  if not exists (select 1 from public.companies where id = p_company_id and status <> 'suspended') then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  insert into public.company_likes (company_id, user_id) values (p_company_id, v_uid);
  return true;
end;
$$;

create function public.toggle_saved_company(p_company_id uuid)
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
  delete from public.saved_companies where company_id = p_company_id and user_id = v_uid;
  if found then
    return false;
  end if;
  if not exists (select 1 from public.companies where id = p_company_id and status <> 'suspended') then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if (select count(*) from public.saved_companies where user_id = v_uid) >= 500 then
    raise exception 'limit_reached' using errcode = 'P0001';
  end if;
  insert into public.saved_companies (user_id, company_id) values (v_uid, p_company_id);
  return true;
end;
$$;

revoke execute on function public.toggle_company_like(uuid) from public, anon;
revoke execute on function public.toggle_saved_company(uuid) from public, anon;
grant execute on function public.toggle_company_like(uuid) to authenticated;
grant execute on function public.toggle_saved_company(uuid) to authenticated;

-- Tarjetas de empresas: portada, logo, rubro, ubicación, empleos abiertos y si ya le diste like o la guardaste.
-- Primero las que tienen empleos abiertos; después, las más queridas.
-- Definer (como post_cards): lee si quien mira le dio like sin abrir esas tablas a los visitantes;
-- devuelve solo datos públicos de empresas no suspendidas y cuenta solo empleos publicados y vigentes.
create function public.company_cards(
  p_query text default null,
  p_saved_only boolean default false,
  p_company_id uuid default null,
  p_limit int default 24,
  p_offset int default 0
)
returns table (
  id uuid, slug text, name text, industry text, city text, country text, cover_path text, logo_path text,
  verified boolean, likes_count int, open_jobs bigint, liked boolean, saved boolean, total_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with q as (select public.like_needle(p_query) as needle),
  open_jobs as (
    select j.company_id, count(*) as n
    from public.jobs j
    where j.status = 'published' and j.valid_through > now()
    group by j.company_id
  )
  select c.id, c.slug::text, c.name, c.industry, c.city, c.country, c.cover_path, c.logo_path,
         c.verified_at is not null, c.likes_count, coalesce(oj.n, 0),
         exists (select 1 from public.company_likes l where l.company_id = c.id and l.user_id = (select auth.uid())),
         exists (select 1 from public.saved_companies s where s.company_id = c.id and s.user_id = (select auth.uid())),
         count(*) over ()
  from public.companies c
  left join open_jobs oj on oj.company_id = c.id
  cross join q
  where c.status <> 'suspended'
    and (p_company_id is null or c.id = p_company_id)
    -- En el listado, las sin reclamar solo si tienen ofertas (las importadas): una página vacía no suma.
    and (c.status = 'active' or coalesce(oj.n, 0) > 0 or p_company_id is not null)
    and (not p_saved_only or exists (select 1 from public.saved_companies s where s.company_id = c.id and s.user_id = (select auth.uid())))
    and (q.needle is null
         or lower(extensions.unaccent(c.name)) like '%' || q.needle || '%'
         or lower(extensions.unaccent(coalesce(c.industry, ''))) like '%' || q.needle || '%')
  order by (coalesce(oj.n, 0) > 0) desc, c.likes_count desc, c.created_at desc
  limit least(greatest(p_limit, 1), 60)
  offset greatest(p_offset, 0);
$$;

grant execute on function public.company_cards(text, boolean, uuid, int, int) to anon, authenticated;

-- La exportación de datos suma las empresas guardadas.
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
    'saved_companies', coalesce((select jsonb_agg(jsonb_build_object('company', c.name, 'saved_at', s.created_at))
                                 from public.saved_companies s join public.companies c on c.id = s.company_id
                                 where s.user_id = (select auth.uid())), '[]'::jsonb),
    'reports', coalesce((select jsonb_agg(jsonb_build_object('job_id', r.job_id, 'reason', r.reason, 'at', r.created_at))
                         from public.job_reports r where r.reporter_id = (select auth.uid())), '[]'::jsonb)
  );
$$;
