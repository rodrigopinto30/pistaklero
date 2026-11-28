begin;
\ir ../support/helpers.inc

select plan(8);

-- Dos personas con una conversación aceptada y una solicitud sin aceptar.
select tests.create_profile('ana@tildes.pgtap.test', 'candidate') as ana \gset
select tests.create_profile('beto@tildes.pgtap.test', 'candidate') as beto \gset
select tests.create_profile('ciro@tildes.pgtap.test', 'candidate') as ciro \gset
insert into public.conversations (pair_key, started_by) values (least(:'ana', :'beto') || ':' || greatest(:'ana', :'beto'), :'ana') returning id as conv \gset
insert into public.conversation_members (conversation_id, user_id, state) values (:'conv', :'ana', 'accepted'), (:'conv', :'beto', 'accepted');
insert into public.conversations (pair_key, started_by) values (least(:'ana', :'ciro') || ':' || greatest(:'ana', :'ciro'), :'ana') returning id as req \gset
insert into public.conversation_members (conversation_id, user_id, state) values (:'req', :'ana', 'accepted'), (:'req', :'ciro', 'request');

select tests.authenticate_as(:'ana');
select public.post_message(:'conv', 'Hola Beto');
select public.post_message(:'req', 'Hola Ciro');
select is((select delivered_at from public.conversation_receipts(:'conv')), null, 'recién enviado: un tilde (ni entregado ni leído)');
reset role;
select max(created_at) as last_at from public.messages where conversation_id = :'conv' \gset

-- Beto abre Pistaklero (su ícono de mensajes pregunta): queda entregado, todavía no leído.
select tests.authenticate_as(:'beto');
select is(public.check_messages(), 1, 'check_messages devuelve los sin leer');
reset role;
select tests.authenticate_as(:'ana');
select ok((select delivered_at from public.conversation_receipts(:'conv')) >= :'last_at'::timestamptz, 'entregado: dos tildes');
select is((select read_at from public.conversation_receipts(:'conv')), null, 'pero sin leer');
reset role;

-- Beto la lee.
select tests.authenticate_as(:'beto');
select public.mark_conversation_read(:'conv');
reset role;
select tests.authenticate_as(:'ana');
select ok((select read_at from public.conversation_receipts(:'conv')) >= :'last_at'::timestamptz, 'leído: dos tildes en azul');
select ok((select other_read_at from public.my_conversations() where id = :'conv') is not null, 'la lista también lo sabe');
reset role;

-- Ciro abre la solicitud sin aceptarla: no se muestra que la leyó.
select tests.authenticate_as(:'ciro');
select public.mark_conversation_read(:'req');
reset role;
select tests.authenticate_as(:'ana');
select is((select read_at from public.conversation_receipts(:'req')), null, 'una solicitud sin aceptar nunca aparece como leída');
reset role;

-- Nadie consulta las tildes de una conversación ajena.
select tests.authenticate_as(:'ciro');
select is((select count(*)::int from public.conversation_receipts(:'conv')), 0, 'sin ser parte, no hay tildes');
reset role;

select * from finish();
rollback;
