begin;
\ir ../support/helpers.inc

select plan(16);

select tests.create_profile('admin@ats.pgtap.test', 'admin') as admin \gset
select tests.create_profile('ana@ats.pgtap.test', 'candidate') as ana \gset

-- Solo el admin agrega tableros
select tests.authenticate_as(:'ana');
select throws_ok($$select public.admin_add_import_source('Tablero', 'https://tablero.pgtap.test', 'greenhouse', 'tablero')$$,
  'P0001', 'not_authorized', 'una candidata no agrega tableros');
select throws_ok($$select public.sync_import_source(gen_random_uuid(), '[]')$$, '42501', null, 'ni sincroniza');
reset role;

select tests.authenticate_as(:'admin');
select throws_ok($$select public.admin_add_import_source('Tablero', 'https://tablero.pgtap.test', 'greenhouse', '../otro')$$,
  'P0001', 'invalid_token', 'el identificador no puede traer barras ni caracteres raros');
select public.admin_add_import_source('Tablero SA', 'https://tablero.pgtap.test', 'greenhouse', 'Tablero') as source \gset
select throws_ok($$select public.admin_add_import_source('Tablero', 'https://tablero.pgtap.test', 'greenhouse', 'tablero')$$,
  'P0001', 'source_exists', 'el mismo tablero no se carga dos veces');
reset role;
select is((select status from public.companies c join public.import_sources s on s.company_id = c.id where s.id = :'source'),
  'unclaimed'::public.company_status, 'la empresa queda sin reclamar');

-- Primera sincronización (como el servidor): 2 válidas y 1 inválida (presencial sin país)
set local role service_role;
select is(public.sync_import_source(:'source', '[
  {"externalId": "1", "title": "Backend Engineer", "url": "https://boards.pgtap.test/1", "summary": "APIs en Go.", "language": "en",
   "seniority": "senior", "employmentType": "full_time", "workMode": "remote", "country": null, "city": null,
   "salaryMin": 100000, "salaryMax": 140000, "salaryCurrency": "USD", "salaryPeriod": "year"},
  {"externalId": "2", "title": "Diseñadora UX", "url": "https://boards.pgtap.test/2", "summary": "Figma.", "language": "es",
   "seniority": "junior", "employmentType": "full_time", "workMode": "hybrid", "country": "AR", "city": "Córdoba"},
  {"externalId": "3", "title": "Sin país", "url": "https://boards.pgtap.test/3", "summary": "", "language": "es",
   "seniority": "junior", "employmentType": "full_time", "workMode": "onsite", "country": null, "city": null}
]'::jsonb), '{"created": 2, "updated": 0, "skipped": 1, "closed": 0}'::jsonb, 'crea las válidas y saltea las inválidas');
reset role;

select is((select count(*)::int from public.jobs where import_source_id = :'source' and status = 'published' and source = 'imported'), 2,
  'quedan publicadas como importadas');
select is((select salary_basis from public.jobs where external_id = 'tablero:1'), 'gross'::public.salary_basis, 'el sueldo del tablero se toma como bruto');

-- La moderación oculta una; después la oferta 2 desaparece del tablero y la 1 cambia de título
select tests.authenticate_as(:'admin');
update public.jobs set status = 'hidden' where external_id = 'tablero:1';
reset role;
set local role service_role;
select is(public.sync_import_source(:'source', '[
  {"externalId": "1", "title": "Senior Backend Engineer", "url": "https://boards.pgtap.test/1", "summary": "APIs en Go.", "language": "en",
   "seniority": "senior", "employmentType": "full_time", "workMode": "remote"}
]'::jsonb) ->> 'closed', '1', 'cierra la que desapareció');
reset role;
select is((select title from public.jobs where external_id = 'tablero:1'), 'Senior Backend Engineer', 'actualiza la que sigue');
select is((select status from public.jobs where external_id = 'tablero:1'), 'hidden'::public.job_status, 'lo oculto por moderación sigue oculto');
select is((select status from public.jobs where external_id = 'tablero:2'), 'closed'::public.job_status, 'la desaparecida queda cerrada');

-- Si vuelve a aparecer, se publica de nuevo
set local role service_role;
select public.sync_import_source(:'source', '[
  {"externalId": "2", "title": "Diseñadora UX", "url": "https://boards.pgtap.test/2", "summary": "Figma.", "language": "es",
   "seniority": "junior", "employmentType": "full_time", "workMode": "hybrid", "country": "AR", "city": "Córdoba"}
]'::jsonb);
select public.record_import_error(:'source', 'not_found');
reset role;
select is((select status from public.jobs where external_id = 'tablero:2'), 'published'::public.job_status, 'la que reaparece vuelve a publicarse');

-- El admin ve el estado y puede pausar
select tests.authenticate_as(:'admin');
select is((select last_error from public.admin_import_sources() where id = :'source'), 'not_found', 'el admin ve el último error');
select is((select open_jobs::int from public.admin_import_sources() where id = :'source'), 1, 'y cuántas ofertas abiertas tiene');
select public.admin_set_import_source_active(:'source', false);
select is((select active from public.admin_import_sources() where id = :'source'), false, 'puede pausar el tablero');
reset role;

select * from finish();
rollback;
