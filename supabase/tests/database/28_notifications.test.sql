begin;
\ir ../support/helpers.inc

select plan(9);

-- Empresa con una oferta y una candidata.
select tests.create_user('rrhh@avisos.pgtap.test') as owner \gset
select tests.authenticate_as(:'owner');
select public.create_company('Avisos Pgtap', 'https://avisos.pgtap.test', 'es') as company \gset
reset role;
insert into public.jobs (company_id, title, description, language, seniority, employment_type, work_mode,
  salary_min, salary_max, salary_currency, salary_period, salary_basis, valid_through, status)
values (:'company', 'Oferta con avisos', 'Una oferta para probar los avisos.', 'es', 'junior', 'full_time', 'remote', 1000, 1500, 'USD', 'month', 'gross', now() + interval '30 days', 'published')
returning id as job \gset
select tests.create_profile('ana@avisos.pgtap.test', 'candidate') as ana \gset
insert into public.people (user_id, first_name, last_name) values (:'ana', 'Ana', 'Avisos');
insert into public.candidates (user_id, slug) values (:'ana', 'ana-avisos-pgtap');

-- Llega una postulación: aviso a la empresa.
insert into public.applications (job_id, candidate_id) values (:'job', :'ana') returning id as application \gset
select is((select count(*)::int from public.notifications where user_id = :'owner' and kind = 'new_applicant'), 1, 'la empresa recibe el aviso de la postulación');

-- La empresa cambia el estado: aviso a la candidata, con el estado nuevo.
insert into public.application_events (application_id, from_status, to_status, actor_type, actor_id)
values (:'application', 'received', 'in_review', 'recruiter', :'owner');
select is((select data->>'status' from public.notifications where user_id = :'ana' and kind = 'application_status'), 'in_review', 'la candidata se entera del cambio de estado');

-- Me gusta en una publicación: los de dos personas se suman en un solo aviso.
select tests.authenticate_as(:'ana');
select public.create_post('Cómo me preparé', 'Practiqué en voz alta con amigos y amigas.', 'es') as slug \gset
reset role;
select tests.create_profile('lu@avisos.pgtap.test', 'candidate') as lu \gset
select tests.create_profile('mo@avisos.pgtap.test', 'candidate') as mo \gset
select tests.authenticate_as(:'lu');
select public.toggle_post_like((select id from public.posts where slug = :'slug'));
reset role;
select tests.authenticate_as(:'mo');
select public.toggle_post_like((select id from public.posts where slug = :'slug'));
reset role;
select is((select count from public.notifications where user_id = :'ana' and kind = 'post_liked'), 2, 'los me gusta se suman en un solo aviso');

-- Cada una ve solo las suyas, y el contador de la campana.
select tests.authenticate_as(:'ana');
select is(public.unread_notifications_count(), 2, 'el contador cuenta las no leídas');
select is((select count(*)::int from public.notifications where user_id = :'owner'), 0, 'no ve las de otras personas');
select lives_ok($$update public.notifications set read_at = now()$$, 'las marca como leídas');
select is(public.unread_notifications_count(), 0, 'después de leerlas, la campana vuelve a cero');
select throws_ok($$update public.notifications set data = '{}'$$, '42501', null, 'no puede cambiar el contenido de un aviso');
select throws_ok($$select public.notify((select auth.uid()), 'job_matches', '{}')$$, '42501', null, 'nadie crea avisos a mano');
reset role;

select * from finish();
rollback;
