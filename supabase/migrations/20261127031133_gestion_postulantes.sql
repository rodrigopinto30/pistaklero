-- Gestión de postulantes: cambios de estado validados, historial y aviso por email a la candidata.

create function public.change_application_status(
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

  -- Transiciones válidas. "Sin respuesta" lo pone solo el sistema y "Retirada" solo la candidata.
  if not (
    (v_application.status = 'received' and p_to in ('in_review', 'interview', 'rejected'))
    or (v_application.status = 'in_review' and p_to in ('interview', 'rejected'))
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
      first_response_at = coalesce(first_response_at, now()),
      closed_at = case when p_to in ('hired', 'rejected') then now() end,
      rejection_message = case when p_to = 'rejected' then v_message end
  where id = p_application_id;

  insert into public.application_events (application_id, from_status, to_status, actor_type, actor_id)
  values (p_application_id, v_application.status, p_to, 'recruiter', (select auth.uid()));

  -- Aviso a la candidata, en su idioma (si no apagó los emails no esenciales... este es esencial).
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

revoke execute on function public.change_application_status(uuid, public.application_status, text) from public, anon;
grant execute on function public.change_application_status(uuid, public.application_status, text) to authenticated;

-- Cantidad de postulaciones por estado de cada oferta de mi empresa (para el panel).
create function public.my_job_application_counts()
returns table (job_id uuid, status public.application_status, total bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select a.job_id, a.status, count(*)
  from public.applications a
  join public.jobs j on j.id = a.job_id
  where j.company_id = public.my_company_id()
  group by a.job_id, a.status;
$$;

revoke execute on function public.my_job_application_counts() from public, anon;
grant execute on function public.my_job_application_counts() to authenticated;
