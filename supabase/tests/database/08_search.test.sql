begin;
\ir ../support/helpers.inc

select plan(12);

select tests.create_user('rrhh@busca.pgtap.test') as owner \gset
select tests.authenticate_as(:'owner');
select public.create_company('Buscadora', 'https://busca.pgtap.test', 'es') as company \gset
reset role;

insert into public.jobs (company_id, title, description, language, seniority, employment_type, work_mode, country,
  salary_min, salary_max, salary_currency, salary_period, salary_basis, valid_through, status)
values
  (:'company', 'Pgtapdev Frontend React', 'Interfaces accesibles.', 'es', 'junior', 'full_time', 'remote', null, 1000, 1500, 'USD', 'month', 'gross', now() + interval '30 days', 'published'),
  (:'company', 'Pgtapdev Backend Engineer', 'APIs in Go.', 'en', 'senior', 'contract', 'onsite', 'AR', 3000, 4000, 'USD', 'month', 'gross', now() + interval '30 days', 'published'),
  (:'company', 'Pgtapdev Diseñadora UX', 'Investigación de usuarios.', 'es', 'trainee', 'internship', 'hybrid', 'AR', 300000, 400000, 'ARS', 'month', 'net', now() + interval '30 days', 'published'),
  (:'company', 'Pgtapdev Borrador', 'No debería aparecer.', 'es', 'junior', 'full_time', 'remote', null, 1000, 1500, 'USD', 'month', 'gross', now() + interval '30 days', 'draft');

select tests.authenticate_as_anon();
select is((select count(*)::int from public.search_jobs('pgtapdev')), 3, 'encuentra las publicadas y no los borradores');
select is((select title from public.search_jobs('pgtapdev diseñadora')), 'Pgtapdev Diseñadora UX', 'busca sin importar los acentos');
select is((select title from public.search_jobs('pgtapdev engineer')), 'Pgtapdev Backend Engineer', 'busca en ofertas en inglés');
select is((select count(*)::int from public.search_jobs('pgtapdev', p_work_modes => array['remote']::public.work_mode[])), 1, 'filtra por modalidad');
select is((select count(*)::int from public.search_jobs('pgtapdev', p_seniorities => array['trainee', 'junior']::public.seniority[])), 2, 'filtra trainee y junior');
select is((select count(*)::int from public.search_jobs('pgtapdev', p_currency => 'USD')), 2, 'filtra por moneda');
select is((select total_count::int from public.search_jobs('pgtapdev', p_limit => 1) limit 1), 3, 'devuelve el total aunque pagine');
select is((select count(*)::int from public.search_jobs('pgtapdev', p_language => 'en')), 1, 'filtra por idioma');
select is((select count(*)::int from public.search_jobs('pgtapd')), 3, 'encuentra palabras a medio escribir');
select is((select title from public.search_jobs('pgtapdev disen')), 'Pgtapdev Diseñadora UX', 'completa la última palabra sin acentos');
select is((select title from public.search_jobs('pgtapdev back') limit 1), 'Pgtapdev Backend Engineer', 'lo que coincide con el título va primero');
select is((select count(*)::int from public.search_jobs('100%_')), 0, 'los comodines de LIKE se buscan como texto');
reset role;

select * from finish();
rollback;
