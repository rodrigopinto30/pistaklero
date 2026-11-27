begin;
\ir ../support/helpers.inc

select plan(19);

-- Empresa con una oferta que tiene 2 preguntas
select tests.create_user('rrhh@postu.pgtap.test') as owner \gset
select tests.authenticate_as(:'owner');
select public.create_company('Postu', 'https://postu.pgtap.test', 'es') as company \gset
reset role;
insert into public.jobs (company_id, title, language, seniority, employment_type, work_mode, salary_min, salary_max,
  salary_currency, salary_period, salary_basis, valid_through, status)
values (:'company', 'Oferta con preguntas', 'es', 'junior', 'full_time', 'remote', 1000, 1500, 'USD', 'month', 'gross', now() + interval '30 days', 'published')
returning id as job \gset
insert into public.job_questions (job_id, position, type, prompt) values (:'job', 1, 'short_text', '¿Por qué te interesa?') returning id as q1 \gset
insert into public.job_questions (job_id, position, type, prompt, options) values (:'job', 2, 'single_choice', '¿Inglés?', array['Básico', 'Avanzado']) returning id as q2 \gset

-- Candidata sin perfil completo
select tests.create_user('ana@pgtap.test') as ana \gset
select tests.authenticate_as(:'ana');
select public.onboard_candidate('Ana', '', 'Pérez', '', 'es');
select throws_ok(format($$select public.apply_to_job(%L, '{}')$$, :'job'), 'P0001', 'profile_incomplete', 'con el perfil incompleto no se puede postular');
select is(public.candidate_missing_requirements(auth.uid()), array['headline', 'experience'], 'se sabe exactamente qué falta');
select is(public.candidate_suggestions(auth.uid()), array['skills'], 'las habilidades se recomiendan, no se exigen');

-- Completa el perfil (sin habilidades: igual puede postularse)
update public.candidates set headline = 'Frontend Junior' where user_id = auth.uid();
insert into public.candidate_projects (candidate_id, title) values (auth.uid(), 'Portfolio');
select is(public.candidate_missing_requirements(auth.uid()), array[]::text[], 'con titular y un proyecto ya está lista');
insert into public.candidate_skills (candidate_id, skill_id) select auth.uid(), id from public.skills where slug = 'react';
select is(public.candidate_suggestions(auth.uid()), array[]::text[], 'con una habilidad ya no hay recomendaciones');

select throws_ok(format($$select public.apply_to_job(%L, '{}')$$, :'job'), 'P0001', 'answer_required', 'las preguntas obligatorias se responden');
select throws_ok(format($$select public.apply_to_job(%L, jsonb_build_object(%L, 'Me encanta', %L, 7))$$, :'job', :'q1', :'q2'),
  'P0001', 'invalid_answer', 'la opción tiene que existir');
select lives_ok(format($$select public.apply_to_job(%L, jsonb_build_object(%L, 'Me encanta el producto', %L, 1))$$, :'job', :'q1', :'q2'),
  'se postula respondiendo las preguntas');
select throws_ok(format($$select public.apply_to_job(%L, jsonb_build_object(%L, 'Otra vez', %L, 0))$$, :'job', :'q1', :'q2'),
  'P0001', 'already_applied', 'no se postula dos veces a la misma oferta');
select is((select status from public.applications where job_id = :'job'), 'received'::public.application_status, 'la postulación queda recibida');
select is((select count(*)::int from public.application_events), 1, 'el historial registra el envío');
select throws_ok($$insert into public.applications (job_id, candidate_id) values (gen_random_uuid(), auth.uid())$$, '42501', null,
  'nadie inserta postulaciones directamente');
reset role;

select id as application from public.applications where job_id = :'job' \gset

-- La empresa ve la postulación, las respuestas y el perfil (aunque sea "oculto")
update public.candidates set visibility = 'hidden' where user_id = :'ana';
select tests.authenticate_as(:'owner');
select is((select count(*)::int from public.applications where id = :'application'), 1, 'la empresa ve la postulación');
select is((select count(*)::int from public.application_answers where application_id = :'application'), 2, 'y las respuestas');
select is((select count(*)::int from public.candidates where user_id = :'ana'), 1, 'y el perfil, aunque sea oculto');
select throws_ok(format($$update public.job_questions set prompt = 'Cambiada' where id = %L$$, :'q1'), 'P0001', 'questions_locked',
  'las preguntas no cambian si ya hay postulaciones');
reset role;

-- Otra empresa no ve nada
select tests.create_user('rrhh@otra.pgtap.test') as other \gset
select tests.authenticate_as(:'other');
select public.create_company('Otra', 'https://otra.pgtap.test', 'es');
select is((select count(*)::int from public.applications where id = :'application'), 0, 'otra empresa no ve la postulación');
reset role;

-- Retirarse
select tests.authenticate_as(:'ana');
select lives_ok(format($$select public.withdraw_application(%L)$$, :'application'), 'la candidata retira su postulación');
select throws_ok(format($$select public.withdraw_application(%L)$$, :'application'), 'P0001', 'invalid_transition', 'no se retira dos veces');
reset role;

select * from finish();
rollback;
