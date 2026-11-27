begin;
\ir ../support/helpers.inc

select plan(11);

select tests.create_profile('admin@imp.pgtap.test', 'admin') as admin \gset
select tests.create_profile('ana@imp.pgtap.test', 'candidate') as ana \gset

select tests.authenticate_as(:'ana');
select throws_ok($$select public.admin_upsert_unclaimed_company('X', 'https://x.pgtap.test')$$, 'P0001', 'not_authorized', 'solo el admin importa empresas');
reset role;

-- Importar
select tests.authenticate_as(:'admin');
select public.admin_upsert_unclaimed_company('Globo SA', 'https://www.globo.pgtap.test/careers') as company \gset
select is(public.admin_upsert_unclaimed_company('Globo', 'https://globo.pgtap.test'), :'company'::uuid, 'el mismo dominio reutiliza la empresa');
insert into public.jobs (company_id, source, status, title, summary, language, seniority, employment_type, work_mode, valid_through, external_url, external_provider)
values (:'company', 'imported', 'published', 'Oferta importada', 'Resumen breve.', 'es', 'junior', 'full_time', 'remote', now() + interval '30 days',
        'https://globo.pgtap.test/jobs/1', 'manual')
returning id as job \gset
reset role;
select is((select status from public.companies where id = :'company'), 'unclaimed'::public.company_status, 'la empresa queda sin reclamar');

-- Una empresa no puede crear ofertas importadas
select tests.create_user('rrhh@otra.pgtap.test') as recruiter \gset
select tests.authenticate_as(:'recruiter');
select public.create_company('Otra', 'https://otra.pgtap.test', 'es') as other_company \gset
select throws_ok(format($$insert into public.jobs (company_id, source, status, title, language, seniority, employment_type, work_mode, valid_through, external_url)
  values (%L, 'imported', 'draft', 'Trampa', 'es', 'junior', 'full_time', 'remote', now() + interval '10 days', 'https://x.pgtap.test')$$, :'other_company'),
  '42501', null, 'una empresa no crea ofertas importadas');
reset role;

-- Clics
select tests.authenticate_as_anon();
select is(public.record_external_click(:'job'), 'https://globo.pgtap.test/jobs/1', 'un visitante va al sitio original');
reset role;
select tests.authenticate_as(:'ana');
select public.record_external_click(:'job');
reset role;
select tests.authenticate_as(:'admin');
select is((select clicks::int from public.admin_unclaimed_companies() where id = :'company'), 2, 'el admin ve cuántos clics recibió la empresa');
reset role;

-- Transferir
select tests.create_user('fundadora@globo.pgtap.test') as founder \gset
select tests.authenticate_as(:'admin');
select throws_ok(format($$select public.admin_transfer_company(%L, 'ana@imp.pgtap.test')$$, :'company'), 'P0001', 'already_onboarded',
  'no se transfiere a una cuenta que ya tiene rol');
select lives_ok(format($$select public.admin_transfer_company(%L, 'fundadora@globo.pgtap.test')$$, :'company'), 'se transfiere a una cuenta nueva');
reset role;
select is((select status from public.companies where id = :'company'), 'active'::public.company_status, 'la empresa queda activa');
select isnt((select verified_at from public.companies where id = :'company'), null, 'y verificada: el email es del dominio');
select is((select member_role from public.company_members where user_id = :'founder'), 'owner'::public.member_role, 'la cuenta queda como owner');

select * from finish();
rollback;
