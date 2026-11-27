-- Límite contra el robo masivo de perfiles: un reclutador ve como mucho 200 perfiles "solo empresas" por día.
-- No alcanza con frenarlo en la página (la API REST es pública): lo aplica la base.
--   * Para ver un perfil "solo empresas", el reclutador tiene que registrar la vista del día
--     (register_profile_view), que falla al pasar el límite.
--   * Las personas que se postularon a su empresa se ven siempre, sin contar.
--   * Los perfiles públicos no cambian: los ve cualquiera, incluso sin cuenta.

create table public.candidate_profile_views (
  viewer_id uuid not null references auth.users (id) on delete cascade,
  candidate_id uuid not null references public.candidates (user_id) on delete cascade,
  viewed_on date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (viewer_id, candidate_id, viewed_on)
);

create index candidate_profile_views_day_idx on public.candidate_profile_views (viewer_id, viewed_on);

alter table public.candidate_profile_views enable row level security;
revoke all on public.candidate_profile_views from anon, authenticated;

create function public.has_applied_to_my_company(p_candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.applications a join public.jobs j on j.id = a.job_id
    where a.candidate_id = p_candidate_id and j.company_id = public.my_company_id()
  );
$$;

-- Registra que quien está logueado mira el perfil del slug. Devuelve 'ok' o 'limit'.
create function public.register_profile_view(p_slug text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_candidate public.candidates%rowtype;
begin
  -- Solo cuentan los reclutadores: un visitante o una candidata solo ven perfiles públicos (o el propio).
  if v_uid is null or public.my_company_id() is null then
    return 'ok';
  end if;
  select * into v_candidate from public.candidates where slug = p_slug;
  if not found or v_candidate.visibility <> 'companies_only' or public.has_applied_to_my_company(v_candidate.user_id) then
    return 'ok';
  end if;
  if exists (select 1 from public.candidate_profile_views
             where viewer_id = v_uid and candidate_id = v_candidate.user_id and viewed_on = current_date) then
    return 'ok';
  end if;
  -- Bloqueo por reclutador: dos pestañas a la vez no pasan el límite.
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
  if (select count(*) from public.candidate_profile_views where viewer_id = v_uid and viewed_on = current_date) >= 200 then
    return 'limit';
  end if;
  insert into public.candidate_profile_views (viewer_id, candidate_id) values (v_uid, v_candidate.user_id)
  on conflict do nothing;
  return 'ok';
end;
$$;

revoke execute on function public.has_applied_to_my_company(uuid) from public, anon;
revoke execute on function public.register_profile_view(text) from public;
grant execute on function public.has_applied_to_my_company(uuid) to authenticated;
grant execute on function public.register_profile_view(text) to anon, authenticated;

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
            or public.has_applied_to_my_company(c.user_id)
            or (
              c.visibility = 'companies_only'
              and public.my_company_id() is not null
              and exists (
                select 1 from public.candidate_profile_views v
                where v.viewer_id = (select auth.uid()) and v.candidate_id = c.user_id and v.viewed_on = current_date
              )
            )
          )
        )
      )
  );
$$;

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

  -- Las vistas de perfil solo sirven para el límite diario: se borran a los 30 días.
  delete from public.candidate_profile_views where viewed_on < current_date - 30;

  -- Badges de todas las empresas con actividad o con badge previo.
  perform public.refresh_company_response_stats(c.id)
  from public.companies c
  where exists (select 1 from public.jobs j where j.company_id = c.id);

  return jsonb_build_object('closed', v_closed, 'warned', v_warned, 'reminded_companies', v_reminded, 'digests', v_digests);
end;
$$;
