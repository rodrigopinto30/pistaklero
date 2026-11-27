begin;
\ir ../support/helpers.inc

select plan(16);

-- Empresa verificada y empresa sin verificar
select tests.create_user('rrhh@acme.pgtap.test') as acme \gset
select tests.authenticate_as(:'acme');
select public.create_company('Acme', 'https://acme.pgtap.test', 'es') as acme_company \gset
reset role;
select tests.create_user('fundadora@gmail.com') as indie \gset
select tests.authenticate_as(:'indie');
select public.create_company('Indie', 'https://indie.pgtap.test', 'es') as indie_company \gset
reset role;

-- Plantilla de una oferta nativa válida
\set job_cols 'company_id, title, description, language, seniority, employment_type, work_mode, salary_min, salary_max, salary_currency, salary_period, salary_basis, valid_through'

select tests.authenticate_as(:'acme');
select throws_ok(
  format($$insert into public.jobs (company_id, title, language, seniority, employment_type, work_mode, valid_through)
           values (%L, 'Sin sueldo', 'es', 'junior', 'full_time', 'remote', now() + interval '30 days')$$, :'acme_company'),
  '23514', null, 'una oferta nativa sin salario no se guarda'
);
select throws_ok(
  format($$insert into public.jobs (%s) values (%L, 'Rango absurdo', '', 'es', 'junior', 'full_time', 'remote', 100, 1000, 'USD', 'month', 'gross', now() + interval '30 days')$$, :'job_cols', :'acme_company'),
  '23514', null, 'el máximo no puede superar 3 veces el mínimo'
);
select throws_ok(
  format($$insert into public.jobs (%s) values (%L, 'Lejana', '', 'es', 'junior', 'full_time', 'remote', 1000, 1500, 'USD', 'month', 'gross', now() + interval '120 days')$$, :'job_cols', :'acme_company'),
  '23514', null, 'una oferta vence en 90 días como máximo'
);
select throws_ok(
  format($$insert into public.jobs (%s) values (%L, 'Presencial sin lugar', '', 'es', 'junior', 'full_time', 'onsite', 1000, 1500, 'USD', 'month', 'gross', now() + interval '30 days')$$, :'job_cols', :'acme_company'),
  '23514', null, 'una oferta presencial necesita país'
);
select throws_ok(
  format($$insert into public.jobs (%s) values (%L, 'Ajena', '', 'es', 'junior', 'full_time', 'remote', 1000, 1500, 'USD', 'month', 'gross', now() + interval '30 days')$$, :'job_cols', :'indie_company'),
  '42501', null, 'nadie publica ofertas en nombre de otra empresa'
);

insert into public.jobs (company_id, title, description, language, seniority, employment_type, work_mode, salary_min, salary_max, salary_currency, salary_period, salary_basis, valid_through, status)
values (:'acme_company', 'Desarrolladora Frontend Junior', 'Trabajarás con React y TypeScript.', 'es', 'junior', 'full_time', 'remote', 1000, 1500, 'USD', 'month', 'gross', now() + interval '30 days', 'published')
returning id as job, slug as job_slug \gset

select isnt((select published_at from public.jobs where id = :'job'), null, 'al publicar se registra la fecha');
select matches(:'job_slug'::text, '^desarrolladora-frontend-junior-', 'la oferta tiene un slug legible');
select throws_ok(format($$update public.jobs set status = 'hidden' where id = %L$$, :'job'), 'P0001', 'not_authorized', 'una empresa no puede ocultar ofertas (es moderación)');

-- Preguntas filtro: como máximo 2
select lives_ok(format($$insert into public.job_questions (job_id, position, type, prompt) values (%L, 1, 'short_text', '¿Por qué te interesa?')$$, :'job'), 'agrega una pregunta corta');
select throws_ok(format($$insert into public.job_questions (job_id, position, type, prompt, options) values (%L, 3, 'single_choice', '¿Tercera?', array['a','b'])$$, :'job'),
  '23514', null, 'no hay lugar para una tercera pregunta');
select throws_ok(format($$insert into public.job_questions (job_id, position, type, prompt, options) values (%L, 2, 'single_choice', '¿Una opción?', array['sola'])$$, :'job'),
  '23514', null, 'una pregunta de opción única necesita entre 2 y 5 opciones');
reset role;

-- Búsqueda
select tests.authenticate_as_anon();
select is((select count(*)::int from public.jobs where id = :'job'), 1, 'una oferta publicada la ve cualquiera');
select is(
  (select count(*)::int from public.jobs where id = :'job' and search_vector @@ websearch_to_tsquery('spanish', extensions.unaccent('desarrolladora acme'))),
  1, 'se encuentra por título y nombre de la empresa'
);
reset role;

-- Empresa sin verificar: hasta 2 ofertas activas
select tests.authenticate_as(:'indie');
select lives_ok(
  format($$insert into public.jobs (%s, status) select %L, 'Oferta ' || n, '', 'es', 'junior', 'full_time', 'remote', 1000, 1500, 'USD', 'month', 'gross', now() + interval '30 days', 'published' from generate_series(1, 2) n$$, :'job_cols', :'indie_company'),
  'una empresa sin verificar publica 2 ofertas'
);
select throws_ok(
  format($$insert into public.jobs (%s, status) values (%L, 'La tercera', '', 'es', 'junior', 'full_time', 'remote', 1000, 1500, 'USD', 'month', 'gross', now() + interval '30 days', 'published')$$, :'job_cols', :'indie_company'),
  'P0001', 'unverified_limit', 'pero no una tercera'
);
reset role;

-- Borradores
select tests.authenticate_as(:'acme');
insert into public.jobs (company_id, title, description, language, seniority, employment_type, work_mode, salary_min, salary_max, salary_currency, salary_period, salary_basis, valid_through)
values (:'acme_company', 'Borrador', '', 'es', 'junior', 'full_time', 'remote', 1000, 1500, 'USD', 'month', 'gross', now() + interval '30 days')
returning id as draft \gset
reset role;
select tests.authenticate_as_anon();
select is((select count(*)::int from public.jobs where id = :'draft'), 0, 'un borrador no es público');
reset role;

select * from finish();
rollback;
