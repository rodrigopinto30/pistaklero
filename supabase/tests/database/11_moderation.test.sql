begin;
\ir ../support/helpers.inc

select plan(13);

select tests.create_user('rrhh@mod.pgtap.test') as owner \gset
select tests.authenticate_as(:'owner');
select public.create_company('Moderada', 'https://mod.pgtap.test', 'es') as company \gset
reset role;
insert into public.jobs (company_id, title, language, seniority, employment_type, work_mode, salary_min, salary_max,
  salary_currency, salary_period, salary_basis, valid_through, status)
values (:'company', 'Oferta sospechosa', 'es', 'junior', 'full_time', 'remote', 1000, 1500, 'USD', 'month', 'gross', now() + interval '30 days', 'published')
returning id as job \gset

select tests.create_profile('a@mod.pgtap.test', 'candidate') as a \gset
select tests.create_profile('b@mod.pgtap.test', 'candidate') as b \gset
select tests.create_profile('c@mod.pgtap.test', 'candidate') as c \gset
select tests.create_profile('admin@mod.pgtap.test', 'admin') as admin \gset

-- Reportes
select tests.authenticate_as(:'a');
select lives_ok(format($$insert into public.job_reports (job_id, reporter_id, reason, details) values (%L, auth.uid(), 'scam', 'Piden plata')$$, :'job'),
  'una cuenta reporta una oferta');
select throws_ok(format($$insert into public.job_reports (job_id, reporter_id, reason) values (%L, auth.uid(), 'fake')$$, :'job'),
  '23505', null, 'cada cuenta reporta una oferta una sola vez');
select throws_ok(format($$insert into public.job_reports (job_id, reporter_id, reason) values (%L, %L, 'fake')$$, :'job', :'b'),
  '42501', null, 'nadie reporta en nombre de otro');
reset role;

select tests.authenticate_as(:'b');
insert into public.job_reports (job_id, reporter_id, reason) values (:'job', auth.uid(), 'fake');
reset role;
select is((select status from public.jobs where id = :'job'), 'published'::public.job_status, 'con 2 reportes sigue publicada');

select tests.authenticate_as(:'c');
insert into public.job_reports (job_id, reporter_id, reason) values (:'job', auth.uid(), 'scam');
reset role;
select is((select status from public.jobs where id = :'job'), 'hidden'::public.job_status, 'con 3 reportes se oculta sola');

select tests.authenticate_as_anon();
select is((select count(*)::int from public.jobs where id = :'job'), 0, 'una oferta oculta no es pública');
reset role;

-- El admin revisa
select tests.authenticate_as(:'a');
select throws_ok('select * from public.admin_open_reports()', 'P0001', 'not_authorized', 'solo el admin ve el resumen de reportes');
reset role;

select tests.authenticate_as(:'admin');
select is((select reports::int from public.admin_open_reports() where job_id = :'job'), 3, 'el admin ve los 3 reportes');
select lives_ok(format($$select public.admin_review_report((select first_report_id from public.admin_open_reports() where job_id = %L), 'dismiss')$$, :'job'),
  'el admin descarta los reportes');
reset role;
select is((select status from public.jobs where id = :'job'), 'published'::public.job_status, 'y la oferta vuelve a publicarse');

-- Suspensiones
select tests.authenticate_as(:'admin');
select lives_ok(format($$select public.admin_set_company_status(%L, 'suspended')$$, :'company'), 'el admin suspende una empresa');
reset role;
select tests.authenticate_as_anon();
select is((select count(*)::int from public.jobs where id = :'job'), 0, 'las ofertas de una empresa suspendida no se ven');
reset role;

select tests.authenticate_as(:'admin');
select throws_ok(format($$select public.admin_set_user_suspended(%L, true)$$, :'admin'), 'P0001', 'cannot_change_self', 'el admin no se suspende a sí mismo');
reset role;

select * from finish();
rollback;
