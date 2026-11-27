-- Datos personales de cada cuenta (candidatos, reclutadores y admins): nombre, segundo nombre
-- (opcional) y apellido en campos separados. El nombre completo se arma solo, para mostrar.
-- Antes el candidato tenía un único "full_name" en su perfil; ahora sale de acá.

create table public.people (
  user_id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 50),
  middle_name text not null default '' check (char_length(middle_name) <= 50),
  last_name text not null default '' check (char_length(last_name) <= 50),
  full_name text generated always as (
    regexp_replace(trim(first_name || ' ' || middle_name || ' ' || last_name), '\s+', ' ', 'g')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.people is 'Datos personales de cada cuenta. Se escriben solo con save_my_name y la bienvenida.';

create trigger people_updated_at before update on public.people
  for each row execute function public.set_updated_at();

alter table public.people enable row level security;

revoke all on public.people from anon, authenticated;
grant select on public.people to anon, authenticated;

-- El nombre se ve donde ya se ve el perfil del candidato (mismas reglas de visibilidad).
create policy "people: cada uno, el admin y quien puede ver el perfil"
  on public.people for select
  to anon, authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_admin())
    or public.can_view_candidate(user_id)
  );

-- Los perfiles existentes: la primera palabra es el nombre y el resto, el apellido.
insert into public.people (user_id, first_name, last_name)
select c.user_id,
       left(split_part(trim(c.full_name), ' ', 1), 50),
       left(trim(substr(trim(c.full_name), char_length(split_part(trim(c.full_name), ' ', 1)) + 1)), 50)
from public.candidates c;

-- El candidato siempre tiene sus datos personales; así la API puede traer candidates → people.
alter table public.candidates
  add constraint candidates_person_fkey foreign key (user_id) references public.people (user_id) on delete cascade;

alter table public.candidates drop column full_name;

-- ---------------------------------------------------------------------------
-- Escritura: solo con estas funciones (validan y recortan).
-- ---------------------------------------------------------------------------

create function public.save_my_name(p_first_name text, p_middle_name text, p_last_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_first text := trim(coalesce(p_first_name, ''));
  v_middle text := trim(coalesce(p_middle_name, ''));
  v_last text := trim(coalesce(p_last_name, ''));
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.profiles where id = v_uid and suspended_at is not null) then
    raise exception 'suspended' using errcode = 'P0001';
  end if;
  if v_first = '' or v_last = '' or char_length(v_first) > 50 or char_length(v_middle) > 50 or char_length(v_last) > 50 then
    raise exception 'invalid_name' using errcode = 'P0001';
  end if;

  insert into public.people (user_id, first_name, middle_name, last_name)
  values (v_uid, v_first, v_middle, v_last)
  on conflict (user_id) do update
    set first_name = excluded.first_name, middle_name = excluded.middle_name, last_name = excluded.last_name;
end;
$$;

revoke execute on function public.save_my_name(text, text, text) from public, anon;
grant execute on function public.save_my_name(text, text, text) to authenticated;

-- La bienvenida del candidato ahora recibe el nombre separado.
drop function public.onboard_candidate(text, text, public.app_locale);

create function public.onboard_candidate(
  p_first_name text,
  p_middle_name text,
  p_last_name text,
  p_headline text,
  p_locale public.app_locale
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_avatar text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'already_onboarded' using errcode = 'P0001';
  end if;

  perform public.save_my_name(p_first_name, p_middle_name, p_last_name);

  select nullif(u.raw_user_meta_data ->> 'avatar_url', '') into v_avatar
  from auth.users u where u.id = v_uid;

  insert into public.profiles (id, role, locale) values (v_uid, 'candidate', p_locale);
  insert into public.candidates (user_id, slug, headline, avatar_url)
  values (
    v_uid,
    public.random_slug(trim(p_first_name) || ' ' || trim(p_last_name)),
    trim(coalesce(p_headline, '')),
    case when v_avatar ~ '^https://' then v_avatar end
  );
end;
$$;

revoke execute on function public.onboard_candidate(text, text, text, text, public.app_locale) from public, anon;
grant execute on function public.onboard_candidate(text, text, text, text, public.app_locale) to authenticated;

-- La bienvenida del reclutador: su nombre y la empresa, todo o nada.
create function public.onboard_recruiter(
  p_first_name text,
  p_middle_name text,
  p_last_name text,
  p_company_name text,
  p_website_url text,
  p_locale public.app_locale
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.save_my_name(p_first_name, p_middle_name, p_last_name);
  return public.create_company(p_company_name, p_website_url, p_locale);
end;
$$;

revoke execute on function public.onboard_recruiter(text, text, text, text, text, public.app_locale) from public, anon;
grant execute on function public.onboard_recruiter(text, text, text, text, text, public.app_locale) to authenticated;

-- La exportación de datos suma los datos personales.
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
    'reports', coalesce((select jsonb_agg(jsonb_build_object('job_id', r.job_id, 'reason', r.reason, 'at', r.created_at))
                         from public.job_reports r where r.reporter_id = (select auth.uid())), '[]'::jsonb)
  );
$$;
