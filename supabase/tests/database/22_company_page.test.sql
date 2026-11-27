begin;
\ir ../support/helpers.inc

select plan(6);

select tests.create_user('rrhh@portada.pgtap.test') as owner \gset
select tests.authenticate_as(:'owner');
select public.create_company('Portadera', 'https://portada.pgtap.test', 'es') as company \gset
reset role;

insert into public.jobs (company_id, title, description, language, seniority, employment_type, work_mode,
  salary_min, salary_max, salary_currency, salary_period, salary_basis, valid_through, status)
values
  (:'company', 'Abierta de portada', 'Oferta.', 'es', 'junior', 'full_time', 'remote', 1000, 1500, 'USD', 'month', 'gross', now() + interval '30 days', 'published'),
  (:'company', 'Cerrada de portada', 'Oferta.', 'es', 'junior', 'full_time', 'remote', 1000, 1500, 'USD', 'month', 'gross', now() + interval '30 days', 'closed');

select tests.authenticate_as(:'owner');
select lives_ok(format($$select public.set_company_cover(%L)$$, :'company' || '/' || repeat('c', 32) || '.webp'), 'la empresa asigna su portada');
select is((select cover_path from public.companies where id = :'company'), :'company' || '/' || repeat('c', 32) || '.webp', 'queda guardada');
select throws_ok($$select public.set_company_cover('otra/' || repeat('c', 32) || '.webp')$$, 'P0001', 'invalid_path', 'solo rutas de su propia carpeta');
reset role;

select tests.create_user('ana@portada.pgtap.test') as ana \gset
select tests.authenticate_as(:'ana');
select throws_ok(format($$select public.set_company_cover(%L)$$, :'company' || '/' || repeat('d', 32) || '.webp'), 'P0001', 'not_authorized', 'alguien de afuera no cambia la portada');
reset role;

select tests.authenticate_as_anon();
select is((select count(*)::int from public.company_job_cards(:'company')), 1, 'la página muestra solo los empleos abiertos');
select is((select title from public.company_job_cards(:'company')), 'Abierta de portada', 'con los datos de la tarjeta');
reset role;

select * from finish();
rollback;
