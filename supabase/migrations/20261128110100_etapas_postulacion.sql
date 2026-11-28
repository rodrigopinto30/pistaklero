-- Etapas de una postulación: Recibida → Vista → Preseleccionada → Entrevista → Contratada.
-- "Vista" se marca sola cuando la empresa la ve (no cuenta como respuesta: el anti-ghosting sigue
-- corriendo); "En revisión" deja de usarse (las que estaban ahí pasan a "Vista"). Descartada, Retirada
-- y Sin respuesta pueden pasar en cualquier momento; contratar, desde cualquier etapa abierta.

-- 1. "En revisión" pasa a "Vista", también en el historial.
update public.applications set status = 'viewed' where status = 'in_review';
update public.application_events set to_status = 'viewed' where to_status = 'in_review';
update public.application_events set from_status = 'viewed' where from_status = 'in_review';

alter table public.applications add column viewed_at timestamptz;
update public.applications a set viewed_at = coalesce(
  (select min(e.created_at) from public.application_events e where e.application_id = a.id and e.to_status = 'viewed'),
  a.first_response_at
) where a.status <> 'received';

drop index public.applications_pending_idx;
create index applications_pending_idx on public.applications (status, status_changed_at)
  where status in ('received', 'viewed', 'in_review', 'shortlisted', 'interview');

-- 2. La empresa vio la postulación (la tarjeta quedó a la vista en su lista). No reinicia los plazos
--    del anti-ghosting ni cuenta como respuesta; la candidata recibe el aviso en la campana.
create function public.mark_applications_viewed(p_application_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company uuid := public.my_company_id();
  v_count integer := 0;
  v_application record;
begin
  if v_company is null then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  for v_application in
    select a.id from public.applications a join public.jobs j on j.id = a.job_id
    where a.id = any (p_application_ids[1:50]) and a.status = 'received' and j.company_id = v_company
    for update of a
  loop
    update public.applications set status = 'viewed', viewed_at = now() where id = v_application.id;
    insert into public.application_events (application_id, from_status, to_status, actor_type, actor_id)
    values (v_application.id, 'received', 'viewed', 'recruiter', (select auth.uid()));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke execute on function public.mark_applications_viewed(uuid[]) from public, anon;
grant execute on function public.mark_applications_viewed(uuid[]) to authenticated;

-- 3. Cambios de etapa que decide la empresa (validados acá; la candidata recibe aviso y email).
create or replace function public.change_application_status(
  p_application_id uuid,
  p_to public.application_status,
  p_message text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_application public.applications%rowtype;
  v_job public.jobs%rowtype;
  v_company_name text;
  v_email text;
  v_locale public.app_locale;
  v_message text := nullif(trim(coalesce(p_message, '')), '');
begin
  select a.* into v_application from public.applications a where a.id = p_application_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;
  select j.* into v_job from public.jobs j where j.id = v_application.job_id;
  if v_job.company_id is distinct from public.my_company_id() then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  -- "Vista" la marca el sistema; "Sin respuesta", el anti-ghosting; "Retirada", la candidata.
  if not (
    (v_application.status in ('received', 'viewed', 'in_review') and p_to in ('shortlisted', 'interview', 'hired', 'rejected'))
    or (v_application.status = 'shortlisted' and p_to in ('interview', 'hired', 'rejected'))
    or (v_application.status = 'interview' and p_to in ('hired', 'rejected'))
  ) then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  if char_length(v_message) > 1000 then
    raise exception 'message_too_long' using errcode = 'P0001';
  end if;

  update public.applications
  set status = p_to,
      status_changed_at = now(),
      viewed_at = coalesce(viewed_at, now()),
      first_response_at = coalesce(first_response_at, now()),
      closed_at = case when p_to in ('hired', 'rejected') then now() end,
      rejection_message = case when p_to = 'rejected' then v_message end
  where id = p_application_id;

  insert into public.application_events (application_id, from_status, to_status, actor_type, actor_id)
  values (p_application_id, v_application.status, p_to, 'recruiter', (select auth.uid()));

  select u.email, p.locale into v_email, v_locale
  from auth.users u join public.profiles p on p.id = u.id
  where u.id = v_application.candidate_id;
  select c.name into v_company_name from public.companies c where c.id = v_job.company_id;

  if v_email is not null then
    perform public.enqueue_email(
      v_email,
      v_application.candidate_id,
      'application_status',
      v_locale,
      jsonb_build_object(
        'jobTitle', v_job.title,
        'companyName', v_company_name,
        'status', p_to,
        'message', case when p_to = 'rejected' then v_message end
      ),
      'status:' || p_application_id || ':' || p_to
    );
  end if;
end;
$$;

-- 4. La candidata puede retirarse mientras la postulación siga abierta (también vista o preseleccionada).
create or replace function public.withdraw_application(p_application_id uuid)
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
  if v_status not in ('received', 'viewed', 'in_review', 'shortlisted', 'interview') then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;

  update public.applications
  set status = 'withdrawn', status_changed_at = now(), closed_at = now()
  where id = p_application_id;
  insert into public.application_events (application_id, from_status, to_status, actor_type, actor_id)
  values (p_application_id, v_status, 'withdrawn', 'candidate', (select auth.uid()));
end;
$$;

-- 5. Anti-ghosting: "Vista" sigue esperando una respuesta (recordatorios a los 7 días, aviso a los
--    14 y cierre como "Sin respuesta" a los 30), igual que "Recibida".
create or replace function public.daily_maintenance()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_closed int := 0;
  v_warned int := 0;
  v_reminded int := 0;
  v_digests int := 0;
  v_row record;
begin
  -- 30 días sin cambios: se cierra como "Sin respuesta" y la candidata queda liberada.
  for v_row in
    select a.id, a.status, a.candidate_id, j.title, c.name as company_name
    from public.applications a join public.jobs j on j.id = a.job_id join public.companies c on c.id = j.company_id
    where a.status in ('received', 'viewed', 'in_review') and a.status_changed_at < now() - interval '30 days'
    for update of a skip locked
  loop
    update public.applications set status = 'no_response', status_changed_at = now(), closed_at = now() where id = v_row.id;
    insert into public.application_events (application_id, from_status, to_status, actor_type)
    values (v_row.id, v_row.status, 'no_response', 'system');
    perform public.enqueue_email(u.email, v_row.candidate_id, 'application_status', p.locale,
      jsonb_build_object('jobTitle', v_row.title, 'companyName', v_row.company_name, 'status', 'no_response'),
      'status:' || v_row.id || ':no_response')
    from auth.users u join public.profiles p on p.id = u.id where u.id = v_row.candidate_id;
    v_closed := v_closed + 1;
  end loop;

  -- 14 días sin cambios: se avisa a la candidata (una sola vez por postulación).
  for v_row in
    select a.id, a.candidate_id, j.title, c.name as company_name
    from public.applications a join public.jobs j on j.id = a.job_id join public.companies c on c.id = j.company_id
    where a.status in ('received', 'viewed', 'in_review') and a.status_changed_at < now() - interval '14 days' and a.candidate_warned_at is null
  loop
    update public.applications set candidate_warned_at = now() where id = v_row.id;
    perform public.enqueue_email(u.email, v_row.candidate_id, 'application_slow', p.locale,
      jsonb_build_object('jobTitle', v_row.title, 'companyName', v_row.company_name),
      'slow:' || v_row.id)
    from auth.users u join public.profiles p on p.id = u.id where u.id = v_row.candidate_id;
    v_warned := v_warned + 1;
  end loop;

  -- 7 días sin cambios: un solo recordatorio por empresa y por día, para cada miembro del equipo.
  for v_row in
    select j.company_id, c.name as company_name, count(*) as pending
    from public.applications a join public.jobs j on j.id = a.job_id join public.companies c on c.id = j.company_id
    where a.status in ('received', 'viewed', 'in_review') and a.status_changed_at < now() - interval '7 days'
      and a.recruiter_reminded_at is null and c.status = 'active'
    group by j.company_id, c.name
  loop
    update public.applications a set recruiter_reminded_at = now()
    from public.jobs j
    where j.id = a.job_id and j.company_id = v_row.company_id
      and a.status in ('received', 'viewed', 'in_review') and a.status_changed_at < now() - interval '7 days' and a.recruiter_reminded_at is null;
    perform public.enqueue_email(u.email, m.user_id, 'recruiter_reminder', p.locale,
      jsonb_build_object('companyName', v_row.company_name, 'pending', v_row.pending),
      'remind:' || v_row.company_id || ':' || m.user_id || ':' || current_date)
    from public.company_members m join auth.users u on u.id = m.user_id join public.profiles p on p.id = m.user_id
    where m.company_id = v_row.company_id and p.suspended_at is null and p.email_notifications;
    v_reminded := v_reminded + 1;
  end loop;

  -- Resumen de las postulaciones nuevas de las últimas 24 h: uno por reclutador y por día, si hubo alguna.
  for v_row in
    with recent as (
      select j.company_id, j.title, count(*) as n
      from public.applications a join public.jobs j on j.id = a.job_id
      where a.created_at >= now() - interval '1 day' and a.status <> 'withdrawn'
      group by j.company_id, j.id, j.title
    ),
    per_company as (
      select company_id, sum(n)::int as total,
             jsonb_agg(jsonb_build_object('title', title, 'count', n) order by n desc, title) as jobs
      from recent group by company_id
    )
    select m.user_id, u.email, p.locale, c.name as company_name, pc.total, pc.jobs
    from per_company pc
    join public.companies c on c.id = pc.company_id and c.status = 'active'
    join public.company_members m on m.company_id = c.id
    join public.profiles p on p.id = m.user_id and p.suspended_at is null and p.email_notifications
    join auth.users u on u.id = m.user_id
  loop
    perform public.enqueue_email(v_row.email, v_row.user_id, 'recruiter_digest', v_row.locale,
      jsonb_build_object('companyName', v_row.company_name, 'total', v_row.total, 'jobs', v_row.jobs),
      'digest:' || v_row.user_id || ':' || current_date);
    v_digests := v_digests + 1;
  end loop;

  -- Las vistas de perfil solo sirven para el límite diario: se borran a los 30 días.
  delete from public.candidate_profile_views where viewed_on < current_date - 30;

  -- Badges de todas las empresas con actividad o con badge previo.
  perform public.refresh_company_response_stats(c.id)
  from public.companies c
  where exists (select 1 from public.jobs j where j.company_id = c.id);

  return jsonb_build_object('closed', v_closed, 'warned', v_warned, 'reminded_companies', v_reminded, 'digests', v_digests);
end;
$$;
