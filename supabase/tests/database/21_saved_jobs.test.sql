begin;
\ir ../support/helpers.inc

select plan(9);

select tests.create_user('rrhh@guardados.pgtap.test') as owner \gset
select tests.authenticate_as(:'owner');
select public.create_company('Guardadora', 'https://guardados.pgtap.test', 'es') as company \gset
reset role;

insert into public.jobs (company_id, title, description, language, seniority, employment_type, work_mode,
  salary_min, salary_max, salary_currency, salary_period, salary_basis, valid_through, status)
values
  (:'company', 'Guardable', 'Oferta.', 'es', 'junior', 'full_time', 'remote', 1000, 1500, 'USD', 'month', 'gross', now() + interval '30 days', 'published'),
  (:'company', 'Borrador guardable', 'Oferta.', 'es', 'junior', 'full_time', 'remote', 1000, 1500, 'USD', 'month', 'gross', now() + interval '30 days', 'draft');
select id as job from public.jobs where title = 'Guardable' and company_id = :'company' \gset
select id as draft from public.jobs where title = 'Borrador guardable' and company_id = :'company' \gset

select tests.create_user('ana@guardados.pgtap.test') as ana \gset
select tests.create_user('beto@guardados.pgtap.test') as beto \gset

select tests.authenticate_as(:'ana');
select public.onboard_candidate('Ana', '', 'Guardados', '', 'es');
select is(public.toggle_saved_job(:'job'), true, 'guarda un empleo');
select is((select count(*)::int from public.saved_jobs), 1, 'lo ve en sus guardados');
select is((select title from public.saved_job_cards()), 'Guardable', 'las tarjetas de guardados traen la oferta');
select throws_ok(format($$select public.toggle_saved_job(%L)$$, :'draft'), 'P0001', 'job_not_available', 'no se guarda una oferta que no es pública');
select throws_ok(format($$insert into public.saved_jobs (user_id, job_id) values (auth.uid(), %L)$$, :'draft'), '42501', null, 'no se inserta directo en la tabla');
reset role;

select tests.authenticate_as(:'beto');
select public.onboard_candidate('Beto', '', 'Guardados', '', 'es');
select is((select count(*)::int from public.saved_jobs where user_id = :'ana'), 0, 'nadie ve los guardados de otra persona');
reset role;

select tests.authenticate_as(:'owner');
select throws_ok(format($$select public.toggle_saved_job(%L)$$, :'job'), 'P0001', 'not_candidate', 'una empresa no guarda empleos');
reset role;

select tests.authenticate_as(:'ana');
select is(public.toggle_saved_job(:'job'), false, 'tocar de nuevo lo saca de guardados');
select is((select count(*)::int from public.saved_jobs), 0, 'y ya no está');
reset role;

select * from finish();
rollback;
