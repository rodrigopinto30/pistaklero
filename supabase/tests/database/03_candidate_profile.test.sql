begin;
\ir ../support/helpers.inc

select plan(14);

-- Candidata con perfil "solo empresas"
select tests.create_user('ana@pgtap.test') as ana \gset
select tests.authenticate_as(:'ana');
select public.onboard_candidate('Ana', '', 'Pérez', 'Frontend', 'es');
reset role;

-- Dos empresas (una será bloqueada)
select tests.create_user('rrhh@acme.pgtap.test') as acme \gset
select tests.authenticate_as(:'acme');
select public.create_company('Acme', 'https://acme.pgtap.test', 'es') as acme_company \gset
reset role;
select tests.create_user('rrhh@globex.pgtap.test') as globex \gset
select tests.authenticate_as(:'globex');
select public.create_company('Globex', 'https://globex.pgtap.test', 'es');
reset role;

-- La candidata arma su perfil
select tests.authenticate_as(:'ana');
select lives_ok(
  $$insert into public.candidate_experiences (candidate_id, company_name, title, start_date)
    values (auth.uid(), 'Startup', 'Pasante', '2025-01-01')$$,
  'la candidata agrega experiencia'
);
select lives_ok(
  $$insert into public.candidate_skills (candidate_id, skill_id, level)
    select auth.uid(), id, 'advanced' from public.skills where slug = 'react'$$,
  'agrega una habilidad del catálogo'
);
select lives_ok(
  $$insert into public.candidate_salary_expectations (candidate_id, amount, currency, period, basis)
    values (auth.uid(), 1500, 'USD', 'month', 'gross')$$,
  'carga su expectativa salarial'
);
select throws_ok(
  $$insert into public.candidate_experiences (candidate_id, company_name, title, start_date, end_date)
    values (auth.uid(), 'X', 'Y', '2025-05-01', '2025-01-01')$$,
  '23514', null, 'la fecha de fin no puede ser anterior al inicio'
);
select throws_ok(
  format($$insert into public.candidate_projects (candidate_id, title) values (%L, 'Robado')$$, :'acme'),
  '42501', null, 'nadie agrega bloques al perfil de otro'
);
select throws_ok(
  $$update public.candidate_experiences set candidate_id = gen_random_uuid()$$,
  '42501', null, 'un bloque no se puede pasar a otro perfil'
);
select lives_ok(
  format($$insert into public.candidate_blocked_companies (candidate_id, company_id) values (auth.uid(), %L)$$, :'acme_company'),
  'bloquea a su empleador actual'
);
reset role;

-- Límite de habilidades
select tests.authenticate_as(:'ana');
select throws_ok(
  $$insert into public.candidate_skills (candidate_id, skill_id)
    select auth.uid(), id from public.skills where slug <> 'react' limit 30$$,
  'P0001', 'limit_reached', 'no se pueden cargar más de 30 habilidades'
);
reset role;

-- Visibilidad (el reclutador registra la vista del día: límite de 200 por día, ver 18_profile_views)
select slug as ana_slug from public.candidates where user_id = :'ana' \gset
select tests.authenticate_as(:'globex');
select public.register_profile_view(:'ana_slug') = 'ok' as registered;
select is((select count(*)::int from public.candidates where user_id = :'ana'), 1, 'una empresa no bloqueada ve el perfil');
select is((select count(*)::int from public.candidate_experiences where candidate_id = :'ana'), 1, 'y también sus bloques');
select is((select count(*)::int from public.candidate_salary_expectations where candidate_id = :'ana'), 0, 'pero no su expectativa salarial');
reset role;

select tests.authenticate_as(:'acme');
select is((select count(*)::int from public.candidates where user_id = :'ana'), 0, 'la empresa bloqueada no ve el perfil');
select is((select count(*)::int from public.candidate_skills where candidate_id = :'ana'), 0, 'ni sus bloques');
reset role;

update public.candidates set visibility = 'public' where user_id = :'ana';
select tests.authenticate_as(:'acme');
select is((select count(*)::int from public.candidates where user_id = :'ana'), 0, 'el bloqueo gana aunque el perfil sea público');
reset role;

select * from finish();
rollback;
