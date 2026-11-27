begin;
\ir ../support/helpers.inc

select plan(6);

select tests.create_user('rrhh@resumen.pgtap.test') as owner \gset
select tests.authenticate_as(:'owner');
select public.create_company('Resumen', 'https://resumen.pgtap.test', 'es') as company \gset
reset role;

-- Una segunda reclutadora que apagó los emails opcionales
select tests.create_profile('silencio@resumen.pgtap.test', 'recruiter') as quiet \gset
update public.profiles set email_notifications = false where id = :'quiet';
insert into public.company_members (company_id, user_id, member_role) values (:'company', :'quiet', 'member');

insert into public.jobs (company_id, title, language, seniority, employment_type, work_mode, salary_min, salary_max,
  salary_currency, salary_period, salary_basis, valid_through, status)
values (:'company', 'Oferta del resumen', 'es', 'junior', 'full_time', 'remote', 1000, 1500, 'USD', 'month', 'gross', now() + interval '30 days', 'published')
returning id as job \gset

create function pg_temp.candidate(p_email text) returns uuid language plpgsql as $$
declare v uuid := tests.create_user(p_email);
begin
  insert into public.profiles (id, role) values (v, 'candidate');
  insert into public.candidates (user_id, slug, full_name) values (v, public.random_slug(p_email), 'Candidata');
  return v;
end $$;

-- Dos postulaciones de hoy y una de hace 8 días
insert into public.applications (job_id, candidate_id, created_at, status_changed_at)
select :'job', pg_temp.candidate('hoy' || n || '@resumen.pgtap.test'), now() - interval '2 hours', now() - interval '2 hours'
from generate_series(1, 2) n;
insert into public.applications (job_id, candidate_id, created_at, status_changed_at)
values (:'job', pg_temp.candidate('vieja@resumen.pgtap.test'), now() - interval '8 days', now() - interval '8 days');

select is((public.daily_maintenance() ->> 'digests')::int, 1, 'manda un resumen');
select is((select (payload ->> 'total')::int from public.email_outbox where template = 'recruiter_digest' and to_user_id = :'owner'), 2,
  'con las postulaciones de las últimas 24 h');
select is((select payload -> 'jobs' -> 0 ->> 'title' from public.email_outbox where template = 'recruiter_digest' and to_user_id = :'owner'), 'Oferta del resumen',
  'y el detalle por oferta');
select is((select count(*)::int from public.email_outbox where to_user_id = :'quiet'), 0,
  'quien apagó los emails opcionales no recibe ni el resumen ni el recordatorio');
select is((select count(*)::int from public.email_outbox where template = 'recruiter_reminder' and to_user_id = :'owner'), 1,
  'el recordatorio de 7 días sí le llega al resto');

select public.daily_maintenance();
select is((select count(*)::int from public.email_outbox where template = 'recruiter_digest' and to_user_id = :'owner'), 1,
  'correrla de nuevo el mismo día no duplica el resumen');

select * from finish();
rollback;
