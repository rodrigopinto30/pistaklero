begin;
\ir ../support/helpers.inc

select plan(9);

select tests.create_user('rrhh@tarjetas.pgtap.test') as owner \gset
select tests.authenticate_as(:'owner');
select public.create_company('Tarjetera Pgtap', 'https://tarjetas.pgtap.test', 'es') as company \gset
reset role;
update public.companies set industry = 'Fintech' where id = :'company';
insert into public.jobs (company_id, title, description, language, seniority, employment_type, work_mode,
  salary_min, salary_max, salary_currency, salary_period, salary_basis, valid_through, status)
values (:'company', 'Abierta tarjetera', 'Oferta.', 'es', 'junior', 'full_time', 'remote', 1000, 1500, 'USD', 'month', 'gross', now() + interval '30 days', 'published');

select tests.create_profile('ana@tarjetas.pgtap.test', 'candidate') as ana \gset

select tests.authenticate_as_anon();
select is((select open_jobs::int from public.company_cards('tarjetera pgtap')), 1, 'la tarjeta cuenta los empleos abiertos');
select is((select name from public.company_cards('fintech') where id = :'company'), 'Tarjetera Pgtap', 'se busca también por rubro');
select throws_ok(format($$select public.toggle_company_like(%L)$$, :'company'), '42501', null, 'sin sesión no hay like');
reset role;

select tests.authenticate_as(:'ana');
select is(public.toggle_company_like(:'company'), true, 'like a una empresa');
select is((select likes_count from public.companies where id = :'company'), 1, 'el contador sube');
select is(public.toggle_saved_company(:'company'), true, 'guardar una empresa');
select is((select saved from public.company_cards(p_saved_only => true) where id = :'company'), true, 'aparece en sus guardadas');
select throws_ok(format($$update public.companies set likes_count = 100 where id = %L$$, :'company'), '42501', null, 'nadie edita el contador a mano');
select is(public.toggle_company_like(:'company'), false, 'tocar de nuevo saca el like');
reset role;

select * from finish();
rollback;
