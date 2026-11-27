-- Postulaciones: 1 clic, respuestas a las preguntas filtro e historial de estados (base del anti-ghosting).

create type public.application_status as enum ('received', 'in_review', 'interview', 'hired', 'rejected', 'no_response', 'withdrawn');
create type public.actor_type as enum ('candidate', 'recruiter', 'system');

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  candidate_id uuid not null references public.candidates (user_id) on delete cascade,
  status public.application_status not null default 'received',
  -- Desde acá corren los plazos del anti-ghosting.
  status_changed_at timestamptz not null default now(),
  -- Primer cambio hecho por la empresa: base del badge de respuesta.
  first_response_at timestamptz,
  closed_at timestamptz,
  rejection_message text check (char_length(rejection_message) <= 1000),
  recruiter_reminded_at timestamptz,
  candidate_warned_at timestamptz,
  created_at timestamptz not null default now(),
  unique (job_id, candidate_id)
);

create index applications_candidate_idx on public.applications (candidate_id, created_at desc);
create index applications_job_idx on public.applications (job_id, created_at desc);
create index applications_pending_idx on public.applications (status, status_changed_at)
  where status in ('received', 'in_review', 'interview');

create table public.application_answers (
  application_id uuid not null references public.applications (id) on delete cascade,
  question_id uuid not null references public.job_questions (id) on delete cascade,
  answer_text text check (char_length(answer_text) between 1 and 280),
  answer_option smallint check (answer_option >= 0),
  primary key (application_id, question_id),
  check (num_nonnulls(answer_text, answer_option) = 1)
);

-- Historial: solo se agregan filas (no hay permisos de UPDATE ni DELETE).
create table public.application_events (
  id bigint generated always as identity primary key,
  application_id uuid not null references public.applications (id) on delete cascade,
  from_status public.application_status,
  to_status public.application_status not null,
  actor_type public.actor_type not null,
  actor_id uuid,
  created_at timestamptz not null default now()
);

create index application_events_application_idx on public.application_events (application_id, created_at);

alter table public.applications enable row level security;
alter table public.application_answers enable row level security;
alter table public.application_events enable row level security;

revoke all on public.applications from anon, authenticated;
revoke all on public.application_answers from anon, authenticated;
revoke all on public.application_events from anon, authenticated;
grant select on public.applications, public.application_answers, public.application_events to authenticated;

-- La ve la candidata, los miembros de la empresa de la oferta y el admin.
create function public.can_view_application(p_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.applications a
    join public.jobs j on j.id = a.job_id
    where a.id = p_application_id
      and (a.candidate_id = (select auth.uid()) or j.company_id = public.my_company_id() or public.is_admin())
  );
$$;

grant execute on function public.can_view_application(uuid) to authenticated;

create policy "applications: candidata, empresa o admin" on public.applications
  for select to authenticated using ((select public.can_view_application(id)));
create policy "application_answers: igual que la postulación" on public.application_answers
  for select to authenticated using ((select public.can_view_application(application_id)));
create policy "application_events: igual que la postulación" on public.application_events
  for select to authenticated using ((select public.can_view_application(application_id)));

-- ---------------------------------------------------------------------------
-- Las empresas donde se postuló ven el perfil (salvo que las haya bloqueado)
-- ---------------------------------------------------------------------------

create or replace function public.can_view_candidate(p_candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.candidates c
    where c.user_id = p_candidate_id
      and (
        c.user_id = (select auth.uid())
        or public.is_admin()
        or (
          not exists (
            select 1 from public.candidate_blocked_companies b
            where b.candidate_id = c.user_id and b.company_id = public.my_company_id()
          )
          and (
            c.visibility = 'public'
            or (c.visibility = 'companies_only' and public.my_company_id() is not null)
            or exists (
              select 1 from public.applications a join public.jobs j on j.id = a.job_id
              where a.candidate_id = c.user_id and j.company_id = public.my_company_id()
            )
          )
        )
      )
  );
$$;

create policy "salario: lo ven las empresas donde se postuló, si la candidata lo eligió"
  on public.candidate_salary_expectations for select to authenticated
  using (
    visibility = 'applied_companies'
    and exists (
      select 1 from public.applications a join public.jobs j on j.id = a.job_id
      where a.candidate_id = candidate_salary_expectations.candidate_id and j.company_id = (select public.my_company_id())
    )
    and not exists (
      select 1 from public.candidate_blocked_companies b
      where b.candidate_id = candidate_salary_expectations.candidate_id and b.company_id = (select public.my_company_id())
    )
  );

-- ---------------------------------------------------------------------------
-- Preguntas bloqueadas cuando ya hay postulaciones (las respuestas dejarían de tener sentido)
-- ---------------------------------------------------------------------------

create function public.job_questions_lock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.applications where job_id = coalesce(old.job_id, new.job_id)) then
    raise exception 'questions_locked' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger job_questions_lock before insert or update or delete on public.job_questions
  for each row execute function public.job_questions_lock();

-- ---------------------------------------------------------------------------
-- Postularse
-- ---------------------------------------------------------------------------

-- Perfil mínimo: nombre, titular, al menos 1 habilidad y 1 de experiencia, proyecto o formación.
create function public.candidate_missing_requirements(p_candidate_id uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select array_remove(array[
    case when not exists (select 1 from public.candidates where user_id = p_candidate_id and char_length(trim(headline)) > 0) then 'headline' end,
    case when not exists (select 1 from public.candidate_skills where candidate_id = p_candidate_id) then 'skills' end,
    case when not exists (select 1 from public.candidate_experiences where candidate_id = p_candidate_id)
          and not exists (select 1 from public.candidate_projects where candidate_id = p_candidate_id)
          and not exists (select 1 from public.candidate_education where candidate_id = p_candidate_id) then 'experience' end
  ], null);
$$;

grant execute on function public.candidate_missing_requirements(uuid) to authenticated;

-- p_answers: {"<question_id>": "texto"} o {"<question_id>": 1} (índice de la opción).
create function public.apply_to_job(p_job_id uuid, p_answers jsonb default '{}'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_job public.jobs%rowtype;
  v_question public.job_questions%rowtype;
  v_answer jsonb;
  v_application_id uuid;
begin
  if public.auth_role() is distinct from 'candidate' then
    raise exception 'not_candidate' using errcode = 'P0001';
  end if;

  select * into v_job from public.jobs where id = p_job_id;
  if not found or v_job.source <> 'native' or not public.is_job_public(v_job) then
    raise exception 'job_not_available' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.candidate_blocked_companies where candidate_id = v_uid and company_id = v_job.company_id) then
    raise exception 'company_blocked' using errcode = 'P0001';
  end if;
  if cardinality(public.candidate_missing_requirements(v_uid)) > 0 then
    raise exception 'profile_incomplete' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.applications where job_id = p_job_id and candidate_id = v_uid) then
    raise exception 'already_applied' using errcode = 'P0001';
  end if;
  if (select count(*) from public.applications where candidate_id = v_uid and created_at > now() - interval '24 hours') >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.applications (job_id, candidate_id) values (p_job_id, v_uid) returning id into v_application_id;

  for v_question in select * from public.job_questions where job_id = p_job_id order by position loop
    v_answer := coalesce(p_answers, '{}'::jsonb) -> v_question.id::text;
    if v_answer is null or v_answer = 'null'::jsonb or (jsonb_typeof(v_answer) = 'string' and trim(v_answer #>> '{}') = '') then
      if v_question.required then
        raise exception 'answer_required' using errcode = 'P0001';
      end if;
      continue;
    end if;

    if v_question.type = 'short_text' then
      if jsonb_typeof(v_answer) <> 'string' or char_length(trim(v_answer #>> '{}')) > 280 then
        raise exception 'invalid_answer' using errcode = 'P0001';
      end if;
      insert into public.application_answers (application_id, question_id, answer_text)
      values (v_application_id, v_question.id, trim(v_answer #>> '{}'));
    else
      if jsonb_typeof(v_answer) <> 'number' or (v_answer #>> '{}')::int < 0
         or (v_answer #>> '{}')::int >= cardinality(v_question.options) then
        raise exception 'invalid_answer' using errcode = 'P0001';
      end if;
      insert into public.application_answers (application_id, question_id, answer_option)
      values (v_application_id, v_question.id, (v_answer #>> '{}')::smallint);
    end if;
  end loop;

  insert into public.application_events (application_id, from_status, to_status, actor_type, actor_id)
  values (v_application_id, null, 'received', 'candidate', v_uid);

  return v_application_id;
end;
$$;

create function public.withdraw_application(p_application_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.application_status;
begin
  select status into v_status from public.applications
  where id = p_application_id and candidate_id = (select auth.uid())
  for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  if v_status not in ('received', 'in_review', 'interview') then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;

  update public.applications
  set status = 'withdrawn', status_changed_at = now(), closed_at = now()
  where id = p_application_id;
  insert into public.application_events (application_id, from_status, to_status, actor_type, actor_id)
  values (p_application_id, v_status, 'withdrawn', 'candidate', (select auth.uid()));
end;
$$;

revoke execute on function public.apply_to_job(uuid, jsonb) from public, anon;
revoke execute on function public.withdraw_application(uuid) from public, anon;
grant execute on function public.apply_to_job(uuid, jsonb) to authenticated;
grant execute on function public.withdraw_application(uuid) to authenticated;
