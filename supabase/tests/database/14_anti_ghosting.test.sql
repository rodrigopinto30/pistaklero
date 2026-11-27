begin;
\ir ../support/helpers.inc

select plan(12);

select tests.create_user('rrhh@ghost.pgtap.test') as owner \gset
select tests.authenticate_as(:'owner');
select public.create_company('Fantasma', 'https://ghost.pgtap.test', 'es') as company \gset
reset role;
insert into public.jobs (company_id, title, language, seniority, employment_type, work_mode, salary_min, salary_max,
  salary_currency, salary_period, salary_basis, valid_through, status)
values (:'company', 'Oferta fantasma', 'es', 'junior', 'full_time', 'remote', 1000, 1500, 'USD', 'month', 'gross', now() + interval '30 days', 'published')
returning id as job \gset

-- Tres candidatas con postulaciones de distintas edades (se simula el paso del tiempo)
create function pg_temp.candidate(p_email text) returns uuid language plpgsql as $$
declare v uuid := tests.create_user(p_email);
begin
  insert into public.profiles (id, role) values (v, 'candidate');
  insert into public.people (user_id, first_name, last_name) values (v, 'Candidata', 'Prueba');
  insert into public.candidates (user_id, slug) values (v, public.random_slug(p_email));
  return v;
end $$;

select pg_temp.candidate('c8@ghost.pgtap.test') as c8 \gset
select pg_temp.candidate('c15@ghost.pgtap.test') as c15 \gset
select pg_temp.candidate('c31@ghost.pgtap.test') as c31 \gset
insert into public.applications (job_id, candidate_id, created_at, status_changed_at) values
  (:'job', :'c8', now() - interval '8 days', now() - interval '8 days'),
  (:'job', :'c15', now() - interval '15 days', now() - interval '15 days'),
  (:'job', :'c31', now() - interval '31 days', now() - interval '31 days');

-- La tarea recorre toda la base: se verifica solo lo de esta empresa (la base local puede tener datos de los e2e).
select lives_ok('select public.daily_maintenance()', 'la tarea diaria corre');
select is((select status from public.applications where candidate_id = :'c31'), 'no_response'::public.application_status, 'queda como "Sin respuesta"');
select is((select actor_type from public.application_events where to_status = 'no_response' and application_id = (select id from public.applications where candidate_id = :'c31')),
  'system'::public.actor_type, 'el cierre lo registra el sistema');
select isnt((select candidate_warned_at from public.applications where candidate_id = :'c15'), null, 'avisa a la candidata de 15 días');
select is((select candidate_warned_at from public.applications where candidate_id = :'c8'), null, 'la de 8 días todavía no recibe aviso');
select is((select count(*)::int from public.email_outbox where template = 'recruiter_reminder' and to_user_id = :'owner'), 1,
  'la empresa recibe un solo recordatorio agrupado');
select is((select (payload ->> 'pending')::int from public.email_outbox where template = 'recruiter_reminder' and to_user_id = :'owner'), 2,
  'con las 2 postulaciones que esperan hace más de 7 días');

-- Idempotente
select public.daily_maintenance();
select is((select count(*)::int from public.email_outbox where template in ('application_slow', 'recruiter_reminder') and payload ->> 'companyName' = 'Fantasma'), 2,
  'correrla de nuevo no duplica avisos');

-- Badge: con menos de 5 postulaciones es "nueva"
select is((select badge from public.company_response_stats where company_id = :'company'), 'new'::public.response_badge, 'con pocas postulaciones el badge es "nueva"');

-- Con 5 postulaciones respondidas en menos de 48 h es "rápida"
select count(*) from (select pg_temp.candidate('f' || n || '@ghost.pgtap.test') from generate_series(1, 5) n) created;
insert into public.applications (job_id, candidate_id, status, created_at, status_changed_at, first_response_at)
select :'job', c.user_id, 'in_review', now() - interval '20 days', now() - interval '19 days', now() - interval '19 days 12 hours'
from public.candidates c join auth.users u on u.id = c.user_id where u.email like 'f_@ghost.pgtap.test';
select public.daily_maintenance();
select is((select badge from public.company_response_stats where company_id = :'company'), 'medium'::public.response_badge,
  '5 rápidas + 1 cerrada sin respuesta + 1 con aviso: "tarda ~1 semana"');

-- El badge es público y llega a la búsqueda
select tests.authenticate_as_anon();
select is((select count(*)::int from public.company_response_stats where company_id = :'company'), 1, 'cualquiera ve el badge');
select is((select company_badge from public.search_jobs('fantasma') limit 1), 'medium'::public.response_badge, 'la búsqueda devuelve el badge');
reset role;

select * from finish();
rollback;
