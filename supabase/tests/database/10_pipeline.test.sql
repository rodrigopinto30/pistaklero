begin;
\ir ../support/helpers.inc

select plan(16);

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
select throws_ok(format($$select public.change_application_status(%L, 'shortlisted')$$, :'application'), 'P0001', 'not_authorized',
  'la candidata no cambia el estado');
reset role;

select tests.authenticate_as(:'owner');
select throws_ok(format($$select public.change_application_status(%L, 'no_response')$$, :'application'), 'P0001', 'invalid_transition',
  '"sin respuesta" lo pone solo el sistema');
select throws_ok(format($$select public.change_application_status(%L, 'viewed')$$, :'application'), 'P0001', 'invalid_transition',
  '"vista" la marca el sistema al verla');
select is(public.mark_applications_viewed(array[:'application']::uuid[]), 1, 'la empresa la ve: pasa a "Vista"');
select is(public.mark_applications_viewed(array[:'application']::uuid[]), 0, 'verla de nuevo no cambia nada');
reset role;

select is((select status from public.applications where id = :'application'), 'viewed'::public.application_status, 'queda como vista');
select is((select first_response_at from public.applications where id = :'application'), null, 'ver no cuenta como respuesta (el anti-ghosting sigue)');
select is((select data->>'status' from public.notifications where user_id = :'ana' and kind = 'application_status'), 'viewed',
  'la candidata se entera de que la vieron');

select tests.authenticate_as(:'owner');
select lives_ok(format($$select public.change_application_status(%L, 'shortlisted')$$, :'application'), 'la preselecciona');
reset role;
select isnt((select first_response_at from public.applications where id = :'application'), null, 'preseleccionar sí es una respuesta');
select is((select locale from public.email_outbox where dedupe_key = 'status:' || :'application' || ':shortlisted'), 'en'::public.app_locale,
  'se encola el aviso en el idioma de la candidata');

select tests.authenticate_as(:'owner');
select lives_ok(format($$select public.change_application_status(%L, 'rejected', 'Gracias por postularte. Elegimos otro perfil.')$$, :'application'),
  'la descarta con un mensaje');
select throws_ok(format($$select public.change_application_status(%L, 'interview')$$, :'application'), 'P0001', 'invalid_transition',
  'una postulación cerrada no se reabre');
reset role;

select is((select rejection_message from public.applications where id = :'application'), 'Gracias por postularte. Elegimos otro perfil.',
  'el mensaje queda guardado');
select is((select array_agg(to_status::text order by created_at) from public.application_events where application_id = :'application'),
  array['received', 'viewed', 'shortlisted', 'rejected'], 'el historial tiene cada etapa');

-- Contratar se puede desde cualquier etapa abierta (por ejemplo, recién recibida).
select tests.create_user('beto@pipe-candidata.pgtap.test') as beto \gset
select tests.authenticate_as(:'beto');
select public.onboard_candidate('Beto', '', 'Gómez', 'Backend', 'es');
insert into public.candidate_skills (candidate_id, skill_id) select auth.uid(), id from public.skills where slug = 'react';
insert into public.candidate_projects (candidate_id, title) values (auth.uid(), 'API');
select public.apply_to_job(:'job') as second \gset
reset role;
select tests.authenticate_as(:'owner');
select lives_ok(format($$select public.change_application_status(%L, 'hired')$$, :'second'), 'se puede contratar directo');
reset role;

select * from finish();
rollback;
