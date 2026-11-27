begin;
\ir ../support/helpers.inc

select plan(12);

select tests.create_user('rrhh@pipe.pgtap.test') as owner \gset
select tests.authenticate_as(:'owner');
select public.create_company('Pipe', 'https://pipe.pgtap.test', 'es') as company \gset
reset role;
insert into public.jobs (company_id, title, language, seniority, employment_type, work_mode, salary_min, salary_max,
  salary_currency, salary_period, salary_basis, valid_through, status)
values (:'company', 'Oferta del pipeline', 'es', 'junior', 'full_time', 'remote', 1000, 1500, 'USD', 'month', 'gross', now() + interval '30 days', 'published')
returning id as job \gset

-- Candidata lista que se postula
select tests.create_user('ana@pipe-candidata.pgtap.test') as ana \gset
select tests.authenticate_as(:'ana');
select public.onboard_candidate('Ana', '', 'Pérez', 'Frontend', 'en');
insert into public.candidate_skills (candidate_id, skill_id) select auth.uid(), id from public.skills where slug = 'react';
insert into public.candidate_projects (candidate_id, title) values (auth.uid(), 'Portfolio');
select public.apply_to_job(:'job') as application \gset
select throws_ok(format($$select public.change_application_status(%L, 'in_review')$$, :'application'), 'P0001', 'not_authorized',
  'la candidata no cambia el estado');
reset role;

select tests.authenticate_as(:'owner');
select throws_ok(format($$select public.change_application_status(%L, 'hired')$$, :'application'), 'P0001', 'invalid_transition',
  'no se salta de recibida a contratada');
select throws_ok(format($$select public.change_application_status(%L, 'no_response')$$, :'application'), 'P0001', 'invalid_transition',
  '"sin respuesta" lo pone solo el sistema');
select lives_ok(format($$select public.change_application_status(%L, 'in_review')$$, :'application'), 'pasa a revisión');
reset role;

select isnt((select first_response_at from public.applications where id = :'application'), null, 'se registra la primera respuesta');
select is((select locale from public.email_outbox where dedupe_key = 'status:' || :'application' || ':in_review'), 'en'::public.app_locale,
  'se encola el aviso en el idioma de la candidata');

select tests.authenticate_as(:'owner');
select lives_ok(format($$select public.change_application_status(%L, 'rejected', 'Gracias por postularte. Elegimos otro perfil.')$$, :'application'),
  'la descarta con un mensaje');
select throws_ok(format($$select public.change_application_status(%L, 'interview')$$, :'application'), 'P0001', 'invalid_transition',
  'una postulación cerrada no se reabre');
select is((select total::int from public.my_job_application_counts() where status = 'rejected'), 1, 'el panel cuenta por estado');
reset role;

select is((select rejection_message from public.applications where id = :'application'), 'Gracias por postularte. Elegimos otro perfil.',
  'el mensaje queda guardado');
select isnt((select closed_at from public.applications where id = :'application'), null, 'la postulación queda cerrada');
select is((select count(*)::int from public.application_events where application_id = :'application'), 3,
  'el historial tiene recibida, en revisión y descartada');

select * from finish();
rollback;
