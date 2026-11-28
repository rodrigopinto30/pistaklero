begin;
\ir ../support/helpers.inc

select plan(20);

-- Una empresa, una candidata pública, una "solo empresas" que se postuló y una oculta.
select tests.create_user('rrhh@mensajes.pgtap.test') as rrhh \gset
select tests.authenticate_as(:'rrhh');
select public.create_company('Mensajes Pgtap', 'https://mensajes.pgtap.test', 'es') as company \gset
reset role;
insert into public.people (user_id, first_name, last_name) values (:'rrhh', 'Rita', 'Mensajes')
  on conflict (user_id) do update set first_name = excluded.first_name;
insert into public.jobs (company_id, title, language, seniority, employment_type, work_mode, salary_min, salary_max,
  salary_currency, salary_period, salary_basis, valid_through, status)
values (:'company', 'Oferta mensajes', 'es', 'junior', 'full_time', 'remote', 1000, 1500, 'USD', 'month', 'gross', now() + interval '30 days', 'published')
returning id as job \gset

select tests.create_profile('pub@mensajes.pgtap.test', 'candidate') as pub \gset
select tests.create_profile('emp@mensajes.pgtap.test', 'candidate') as emp \gset
select tests.create_profile('oculta@mensajes.pgtap.test', 'candidate') as oculta \gset
insert into public.people (user_id, first_name, last_name) values (:'pub', 'Paula', 'Pub'), (:'emp', 'Ema', 'Emp'), (:'oculta', 'Olga', 'Oculta');
insert into public.candidates (user_id, slug, headline, visibility) values
  (:'pub', 'pub-mensajes-pgtap', 'Frontend', 'public'),
  (:'emp', 'emp-mensajes-pgtap', 'Backend', 'companies_only'),
  (:'oculta', 'oculta-mensajes-pgtap', 'Datos', 'hidden');
insert into public.applications (job_id, candidate_id) values (:'job', :'emp');

-- La empresa le escribe a una desconocida: llega como solicitud.
select tests.authenticate_as(:'rrhh');
select public.start_conversation(:'pub', 'Hola Paula, ¿te interesa una entrevista?') as conv \gset
select is((select count(*)::int from public.my_conversations('inbox')), 1, 'quien escribe la ve en su bandeja');
select ok((select waiting from public.my_conversations('inbox') where id = :'conv'), 'figura como esperando que acepte');
select throws_ok(format($$select public.post_message(%L, 'Hola de nuevo')$$, :'conv'), 'P0001', 'request_pending', 'no puede insistir hasta que acepte');
select throws_ok(format($$select public.start_conversation(%L, 'Hola')$$, :'oculta'), 'P0001', 'not_available', 'a un perfil oculto no se le escribe');
-- Con una postulación de por medio, arranca aceptada.
select public.start_conversation(:'emp', 'Gracias por postularte, Ema.') as conv2 \gset
reset role;

select tests.authenticate_as(:'pub');
select is((select count(*)::int from public.my_conversations('requests')), 1, 'la candidata la ve en Solicitudes');
select is(public.unread_messages_count(), 1, 'la solicitud cuenta en el ícono');
select is((select other_subtitle from public.my_conversations('requests')), 'Mensajes Pgtap', 've el nombre de la empresa');
select is((select count(*)::int from public.conversation_messages(:'conv')), 1, 'puede leer el mensaje antes de aceptar');
-- Responder es aceptar.
select lives_ok(format($$select public.post_message(%L, '¡Hola! Sí, me interesa.')$$, :'conv'), 'responde');
select is((select count(*)::int from public.my_conversations('inbox')), 1, 'responder la pasa a la bandeja');
reset role;

select tests.authenticate_as(:'rrhh');
select is(public.unread_messages_count(), 1, 'la empresa tiene un mensaje sin leer');
select public.mark_conversation_read(:'conv');
select is(public.unread_messages_count(), 0, 'al leerla, el contador baja');
select lives_ok(format($$select public.post_message(%L, 'Genial, te escribo los detalles.')$$, :'conv'), 'ahora sí puede seguir escribiendo');
reset role;

select tests.authenticate_as(:'emp');
select is((select count(*)::int from public.my_conversations('inbox')), 1, 'con postulación de por medio llega directo a la bandeja');
reset role;

-- Nadie de afuera lee la conversación ni las tablas.
select tests.authenticate_as(:'oculta');
select is((select count(*)::int from public.conversation_messages(:'conv')), 0, 'alguien de afuera no ve los mensajes');
select throws_ok($$select * from public.messages$$, '42501', null, 'la tabla de mensajes no se lee directo');
reset role;

-- Bloquear corta la conversación en los dos sentidos.
select id as spam from public.messages where conversation_id = :'conv' and sender_id = :'rrhh' order by created_at limit 1 \gset
select tests.authenticate_as(:'pub');
select public.block_user(:'rrhh');
select is((select count(*)::int from public.my_conversations('inbox')), 0, 'bloqueada, desaparece de la bandeja');
select public.report_message(:'spam', 'spam');
reset role;
select is((select count(*)::int from public.message_reports where message_id = :'spam'), 1, 'el mensaje queda denunciado');
select tests.authenticate_as(:'rrhh');
select throws_ok(format($$select public.post_message(%L, '¿Seguís ahí?')$$, :'conv'), 'P0001', 'not_available', 'con un bloqueo no se puede escribir');
select ok(not public.can_i_message(:'pub'), 'ni arrancar otra conversación');
reset role;

select * from finish();
rollback;
