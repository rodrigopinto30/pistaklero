-- Empleos guardados y postulación sin habilidades.

-- ---------------------------------------------------------------------------
-- Guardar empleos (solo candidatos). Cada uno ve y maneja solo los suyos.
-- ---------------------------------------------------------------------------

create table public.saved_jobs (
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

create index saved_jobs_user_created_idx on public.saved_jobs (user_id, created_at desc);

alter table public.saved_jobs enable row level security;

revoke all on public.saved_jobs from anon, authenticated;
grant select, delete on public.saved_jobs to authenticated;

create policy "saved_jobs: cada uno ve los suyos"
  on public.saved_jobs for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "saved_jobs: cada uno borra los suyos"
  on public.saved_jobs for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Guarda o saca de guardados. Devuelve true si quedó guardado.
-- Se guarda solo una oferta visible para quien la guarda, y hasta 500 por cuenta (anti-abuso).
create function public.toggle_saved_job(p_job_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if public.auth_role() is distinct from 'candidate' then
    raise exception 'not_candidate' using errcode = 'P0001';
  end if;

  delete from public.saved_jobs where user_id = v_uid and job_id = p_job_id;
  if found then
    return false;
  end if;

  if not exists (select 1 from public.jobs j where j.id = p_job_id and public.is_job_public(j)) then
    raise exception 'job_not_available' using errcode = 'P0001';
  end if;
  if (select count(*) from public.saved_jobs where user_id = v_uid) >= 500 then
    raise exception 'limit_reached' using errcode = 'P0001';
  end if;

  insert into public.saved_jobs (user_id, job_id) values (v_uid, p_job_id);
  return true;
end;
$$;

revoke execute on function public.toggle_saved_job(uuid) from public, anon;
grant execute on function public.toggle_saved_job(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Postularse sin habilidades: ya no es requisito, pasa a ser una recomendación.
-- ---------------------------------------------------------------------------

create or replace function public.candidate_missing_requirements(p_candidate_id uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select array_remove(array[
    case when not exists (select 1 from public.candidates where user_id = p_candidate_id and char_length(trim(headline)) > 0) then 'headline' end,
    case when not exists (select 1 from public.candidate_experiences where candidate_id = p_candidate_id)
          and not exists (select 1 from public.candidate_projects where candidate_id = p_candidate_id)
          and not exists (select 1 from public.candidate_education where candidate_id = p_candidate_id) then 'experience' end
  ], null);
$$;

-- Lo que conviene completar aunque no sea obligatorio (se muestra al lado del botón de postularse).
create function public.candidate_suggestions(p_candidate_id uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select array_remove(array[
    case when not exists (select 1 from public.candidate_skills where candidate_id = p_candidate_id) then 'skills' end
  ], null)
  where p_candidate_id = (select auth.uid());
$$;

revoke execute on function public.candidate_suggestions(uuid) from public, anon;
grant execute on function public.candidate_suggestions(uuid) to authenticated;

-- La exportación de datos suma los empleos guardados.
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
    'reports', coalesce((select jsonb_agg(jsonb_build_object('job_id', r.job_id, 'reason', r.reason, 'at', r.created_at))
                         from public.job_reports r where r.reporter_id = (select auth.uid())), '[]'::jsonb)
  );
$$;

-- Empleos guardados que siguen abiertos, con las mismas columnas que la búsqueda (se muestran con la misma tarjeta).
create function public.saved_job_cards()
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
  from public.saved_jobs sj
  join public.jobs j on j.id = sj.job_id
  join public.companies c on c.id = j.company_id
  left join public.company_response_stats st on st.company_id = c.id
  where sj.user_id = (select auth.uid())
    and j.status = 'published'
    and j.valid_through > now()
    and c.status <> 'suspended'
  order by sj.created_at desc
  limit 500;
$$;

grant execute on function public.saved_job_cards() to authenticated;
