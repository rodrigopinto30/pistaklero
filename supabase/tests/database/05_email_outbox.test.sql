begin;
\ir ../support/helpers.inc

select plan(7);

select tests.create_profile('ana@pgtap.test', 'candidate') as ana \gset

-- Nadie desde el cliente accede a la cola
select tests.authenticate_as(:'ana');
select throws_ok('select * from public.email_outbox', '42501', null, 'un usuario no puede leer la cola de emails');
select throws_ok($$select public.enqueue_email('x@pgtap.test', null, 'spam', 'es', '{}')$$, '42501', null, 'un usuario no puede encolar emails');
select throws_ok('select * from public.claim_email_batch(10)', '42501', null, 'un usuario no puede tomar emails para enviar');
reset role;

-- El sistema encola sin duplicar
select public.enqueue_email('ana@pgtap.test', :'ana', 'team_invitation', 'es', '{"a":1}', 'pgtap:uno');
select public.enqueue_email('ana@pgtap.test', :'ana', 'team_invitation', 'es', '{"a":2}', 'pgtap:uno');
select is((select count(*)::int from public.email_outbox where dedupe_key = 'pgtap:uno'), 1, 'la misma clave no se encola dos veces');

-- Tomar un lote
select is((select count(*)::int from public.claim_email_batch(100) where dedupe_key = 'pgtap:uno'), 1, 'el lote incluye el email pendiente');
select is((select attempts from public.email_outbox where dedupe_key = 'pgtap:uno'), 1, 'cuenta el intento');
select is((select count(*)::int from public.claim_email_batch(100) where dedupe_key = 'pgtap:uno'), 0, 'un email tomado no se vuelve a tomar enseguida');

select * from finish();
rollback;
