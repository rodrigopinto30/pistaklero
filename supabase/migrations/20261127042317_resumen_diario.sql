-- Resumen diario para reclutadores (postulaciones nuevas de las últimas 24 h) y respeto de los emails opcionales:
-- el resumen y el recordatorio de 7 días no se mandan a quien los apagó en Ajustes. Los avisos sobre una
-- postulación propia (cambio de estado, demora, cierre) son esenciales y siempre llegan.

-- Tarea diaria. Es idempotente: correrla dos veces el mismo día no duplica avisos.
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
    where a.status in ('received', 'in_review') and a.status_changed_at < now() - interval '30 days'
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
    where a.status in ('received', 'in_review') and a.status_changed_at < now() - interval '14 days' and a.candidate_warned_at is null
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
    where a.status in ('received', 'in_review') and a.status_changed_at < now() - interval '7 days'
      and a.recruiter_reminded_at is null and c.status = 'active'
    group by j.company_id, c.name
  loop
    update public.applications a set recruiter_reminded_at = now()
    from public.jobs j
    where j.id = a.job_id and j.company_id = v_row.company_id
      and a.status in ('received', 'in_review') and a.status_changed_at < now() - interval '7 days' and a.recruiter_reminded_at is null;
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

  -- Badges de todas las empresas con actividad o con badge previo.
  perform public.refresh_company_response_stats(c.id)
  from public.companies c
  where exists (select 1 from public.jobs j where j.company_id = c.id);

  return jsonb_build_object('closed', v_closed, 'warned', v_warned, 'reminded_companies', v_reminded, 'digests', v_digests);
end;
$$;
