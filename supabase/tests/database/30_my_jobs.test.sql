begin;
\ir ../support/helpers.inc

select plan(13);

select tests.create_user('rrhh@misofertas.pgtap.test') as owner \gset
select tests.authenticate_as(:'owner');
select public.create_company('Mis Ofertas Pgtap', 'https://misofertas.pgtap.test', 'es') as company \gset
reset role;
insert into public.people (user_id, first_name, last_name) values (:'owner', 'Rita', 'Pgtap')
  on conflict (user_id) do update set first_name = excluded.first_name, last_name = excluded.last_name;

insert into public.jobs (company_id, title, language, seniority, employment_type, work_mode, salary_min, salary_max,
  salary_currency, salary_period, salary_basis, valid_through, status, created_by)
values (:'company', 'Frontend Pgtap', 'es', 'junior', 'full_time', 'remote', 1000, 1500, 'USD', 'month', 'gross', now() + interval '30 days', 'published', :'owner')
returning id as job \gset
insert into public.jobs (company_id, title, language, seniority, employment_type, work_mode, salary_min, salary_max,
  salary_currency, salary_period, salary_basis, valid_through, status, created_by)
values (:'company', 'Borrador Pgtap', 'es', 'junior', 'full_time', 'remote', 1000, 1500, 'USD', 'month', 'gross', now() + interval '30 days', 'draft', :'owner')
returning id as draft \gset

-- Vistas: una por persona por día; la propia empresa no suma; los borradores no cuentan.
select ok(public.record_job_view(:'job', repeat('a', 64)), 'la primera vista del día cuenta');
select ok(not public.record_job_view(:'job', repeat('a', 64)), 'la misma persona el mismo día no suma otra');
select ok(public.record_job_view(:'job', repeat('b', 64)), 'otra persona sí');
select ok(not public.record_job_view(:'job', repeat('c', 64), :'owner'), 'la propia empresa no suma vistas');
select ok(not public.record_job_view(:'draft', repeat('d', 64)), 'un borrador no recibe vistas');
select ok(not public.record_job_view(:'job', 'no-es-un-hash'), 'un hash inválido se ignora');

select tests.authenticate_as(:'owner');
select throws_ok($$select public.record_job_view(gen_random_uuid(), repeat('e', 64))$$, '42501', null, 'nadie más que el servidor registra vistas');

-- El listado de la empresa, con sus números y filtros.
select is((select views from public.company_job_stats() where id = :'job'), 2::bigint, 'el listado muestra las vistas');
select is((select count(*)::int from public.company_job_stats(p_status => 'active')), 1, 'filtra por estado');
select is((select count(*)::int from public.company_job_stats(p_query => 'borrador')), 1, 'busca por título');
select is((select creator_name from public.company_job_stats() where id = :'job'), 'Rita Pgtap', 'muestra quién la publicó');

-- El cargo de cada persona y "Publicada por" en la oferta pública.
select public.set_my_job_title('Talent Acquisition');
reset role;
select tests.authenticate_as_anon();
select is((select job_title from public.job_poster(:'job')), 'Talent Acquisition', 'la oferta muestra quién la publicó y su cargo');
reset role;

-- Otra empresa no ve los números de esta.
select tests.create_user('otra@misofertas.pgtap.test') as other \gset
select tests.authenticate_as(:'other');
select public.create_company('Otra Pgtap', 'https://otra-misofertas.pgtap.test', 'es');
select is((select count(*)::int from public.company_job_stats() where id = :'job'), 0, 'otra empresa no ve las ofertas ajenas');
reset role;

select * from finish();
rollback;
