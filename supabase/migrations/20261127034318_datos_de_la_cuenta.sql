-- Derechos sobre los datos (Ley 25.326 / GDPR): exportar todo y borrar la cuenta.

-- Todos los datos de la cuenta actual, en un solo JSON.
create function public.export_my_data()
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

revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- Si se va el último miembro de una empresa (por ejemplo, borró su cuenta), la empresa queda sin reclamar.
create function public.company_members_after_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.company_members where company_id = old.company_id) then
    update public.companies set status = 'unclaimed' where id = old.company_id and status = 'active';
  end if;
  return null;
end;
$$;

create trigger company_members_after_delete after delete on public.company_members
  for each row execute function public.company_members_after_delete();
