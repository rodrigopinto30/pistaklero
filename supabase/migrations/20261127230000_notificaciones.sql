-- Notificaciones dentro del sitio (la campana del encabezado, como en LinkedIn).
-- Se generan solas, con triggers: el texto se arma en la app con los datos guardados (y se traduce).

create type public.notification_kind as enum (
  'application_status', -- a la candidata: cambió el estado de su postulación
  'new_applicant',      -- a la empresa: llegó una postulación
  'post_liked',         -- a quien escribió: me gusta en su publicación
  'company_liked',      -- a la empresa: me gusta en su página
  'job_matches',        -- a la candidata: empleos nuevos que coinciden con sus habilidades
  'member_joined',      -- a los owners: alguien se sumó al equipo
  'role_changed'        -- a quien cambió de rol en el equipo
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.notification_kind not null,
  data jsonb not null default '{}',
  -- Para agrupar: mientras no se lea, los avisos iguales se suman (por ejemplo, los me gusta de una publicación).
  group_key text,
  count int not null default 1 check (count >= 1),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
create unique index notifications_group_unread_idx on public.notifications (user_id, group_key)
  where read_at is null and group_key is not null;

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
-- Lo único que se puede cambiar es marcarlas como leídas.
grant update (read_at) on public.notifications to authenticated;

create policy "notifications: cada uno ve las suyas"
  on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications: cada uno marca las suyas"
  on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications: cada uno borra las suyas"
  on public.notifications for delete to authenticated using (user_id = (select auth.uid()));

-- Crea (o suma a) un aviso. Solo la usan los triggers y las tareas del sistema.
create function public.notify(p_user_id uuid, p_kind public.notification_kind, p_data jsonb, p_group_key text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    return;
  end if;
  if p_group_key is null then
    insert into public.notifications (user_id, kind, data) values (p_user_id, p_kind, p_data);
  else
    insert into public.notifications (user_id, kind, data, group_key) values (p_user_id, p_kind, p_data, p_group_key)
    on conflict (user_id, group_key) where read_at is null and group_key is not null
    do update set count = public.notifications.count + 1, data = excluded.data, created_at = now();
  end if;
end;
$$;

revoke execute on function public.notify(uuid, public.notification_kind, jsonb, text) from public, anon, authenticated;

-- Contador de la campana (rápido: usa el índice de no leídas).
create function public.unread_notifications_count()
returns int
language sql
stable
set search_path = ''
as $$
  select count(*)::int from public.notifications where user_id = (select auth.uid()) and read_at is null;
$$;

grant execute on function public.unread_notifications_count() to authenticated;

-- ---------------------------------------------------------------------------
-- Disparadores
-- ---------------------------------------------------------------------------

-- La empresa (o el sistema, al cerrar por falta de respuesta) cambia el estado: aviso a la candidata.
create function public.notify_application_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_candidate uuid;
  v_job record;
begin
  if new.actor_type = 'candidate' or new.from_status is null then
    return new;
  end if;
  select a.candidate_id into v_candidate from public.applications a where a.id = new.application_id;
  select j.title, j.slug::text as slug, c.name as company into v_job
  from public.applications a join public.jobs j on j.id = a.job_id join public.companies c on c.id = j.company_id
  where a.id = new.application_id;
  perform public.notify(v_candidate, 'application_status',
    jsonb_build_object('job_title', v_job.title, 'job_slug', v_job.slug, 'company', v_job.company, 'status', new.to_status));
  return new;
end;
$$;

create trigger application_events_notify after insert on public.application_events
  for each row execute function public.notify_application_event();

-- Llega una postulación: aviso a cada persona del equipo (se suman las de una misma oferta).
create function public.notify_new_applicant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job record;
  v_member uuid;
begin
  select j.id, j.title, j.company_id into v_job from public.jobs j where j.id = new.job_id;
  for v_member in select m.user_id from public.company_members m where m.company_id = v_job.company_id loop
    perform public.notify(v_member, 'new_applicant',
      jsonb_build_object('job_title', v_job.title, 'job_id', v_job.id), 'applicants:' || v_job.id::text);
  end loop;
  return new;
end;
$$;

create trigger applications_notify after insert on public.applications
  for each row execute function public.notify_new_applicant();

-- Me gusta en una publicación: aviso a quien la escribió (no si se da me gusta a sí misma).
create function public.notify_post_liked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post record;
begin
  select p.id, p.title, p.slug::text as slug, p.author_id into v_post from public.posts p where p.id = new.post_id;
  if v_post.author_id is distinct from new.user_id then
    perform public.notify(v_post.author_id, 'post_liked',
      jsonb_build_object('post_title', v_post.title, 'post_slug', v_post.slug), 'post:' || v_post.id::text);
  end if;
  return new;
end;
$$;

create trigger post_likes_notify after insert on public.post_likes
  for each row execute function public.notify_post_liked();

-- Me gusta en la página de la empresa: aviso al equipo.
create function public.notify_company_liked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company record;
  v_member uuid;
begin
  select c.id, c.name, c.slug::text as slug into v_company from public.companies c where c.id = new.company_id;
  for v_member in select m.user_id from public.company_members m where m.company_id = v_company.id and m.user_id <> new.user_id loop
    perform public.notify(v_member, 'company_liked',
      jsonb_build_object('company', v_company.name, 'company_slug', v_company.slug), 'company:' || v_company.id::text);
  end loop;
  return new;
end;
$$;

create trigger company_likes_notify after insert on public.company_likes
  for each row execute function public.notify_company_liked();

-- Alguien se suma al equipo (aceptó una invitación): aviso a los owners. Quien crea la empresa no.
create function public.notify_member_joined()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_email text;
begin
  select u.email into v_email from auth.users u where u.id = new.user_id;
  for v_owner in select m.user_id from public.company_members m
                 where m.company_id = new.company_id and m.member_role = 'owner' and m.user_id <> new.user_id loop
    perform public.notify(v_owner, 'member_joined', jsonb_build_object('email', v_email));
  end loop;
  return new;
end;
$$;

create trigger company_members_notify_joined after insert on public.company_members
  for each row execute function public.notify_member_joined();

-- Cambió el rol de alguien en el equipo: aviso a esa persona.
create function public.notify_role_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company text;
begin
  if new.member_role is distinct from old.member_role then
    select c.name into v_company from public.companies c where c.id = new.company_id;
    perform public.notify(new.user_id, 'role_changed', jsonb_build_object('role', new.member_role, 'company', v_company));
  end if;
  return new;
end;
$$;

create trigger company_members_notify_role after update of member_role on public.company_members
  for each row execute function public.notify_role_changed();

-- Una vez por día (la tarea del cron): a cada candidata, cuántos empleos de las últimas 24 horas
-- coinciden con al menos una de sus habilidades (sin contar empresas bloqueadas ni donde ya se postuló).
create function public.notify_job_matches()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
  v_total int := 0;
begin
  for v_row in
    select cs.candidate_id, count(distinct j.id) as jobs
    from public.candidate_skills cs
    join public.job_skills js on js.skill_id = cs.skill_id
    join public.jobs j on j.id = js.job_id
    join public.profiles p on p.id = cs.candidate_id and p.suspended_at is null
    where j.status = 'published' and j.valid_through > now() and j.published_at > now() - interval '24 hours'
      and not exists (select 1 from public.candidate_blocked_companies b where b.candidate_id = cs.candidate_id and b.company_id = j.company_id)
      and not exists (select 1 from public.applications a where a.candidate_id = cs.candidate_id and a.job_id = j.id)
    group by cs.candidate_id
  loop
    perform public.notify(v_row.candidate_id, 'job_matches', jsonb_build_object('count', v_row.jobs),
      'matches:' || to_char(now(), 'YYYY-MM-DD'));
    v_total := v_total + 1;
  end loop;
  return v_total;
end;
$$;

revoke execute on function public.notify_job_matches() from public, anon, authenticated;
grant execute on function public.notify_job_matches() to service_role;

-- La descarga de los datos de la cuenta suma las notificaciones.
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
    'external_applications', coalesce((select jsonb_agg(jsonb_build_object('job', j.title, 'company', co.name, 'applied_at', x.created_at))
                                       from public.external_applications x join public.jobs j on j.id = x.job_id
                                       join public.companies co on co.id = j.company_id
                                       where x.candidate_id = (select auth.uid())), '[]'::jsonb),
    'notifications', coalesce((select jsonb_agg(jsonb_build_object('kind', n.kind, 'data', n.data, 'at', n.created_at, 'read_at', n.read_at))
                               from public.notifications n where n.user_id = (select auth.uid())), '[]'::jsonb),
    'reports', coalesce((select jsonb_agg(jsonb_build_object('job_id', r.job_id, 'reason', r.reason, 'at', r.created_at))
                         from public.job_reports r where r.reporter_id = (select auth.uid())), '[]'::jsonb)
  );
$$;
