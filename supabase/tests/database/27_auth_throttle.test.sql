begin;
\ir ../support/helpers.inc

select plan(8);

\set k_email 'email:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
\set k_ip 'ip:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'

-- Nadie de afuera la toca: ni visitantes ni cuentas.
select tests.authenticate_as_anon();
select throws_ok($$select public.auth_throttle_wait(array['x'])$$, '42501', null, 'un visitante no consulta el límite');
select throws_ok($$select * from public.auth_throttle$$, '42501', null, 'un visitante no lee la tabla');
reset role;

set local role service_role;
select is(public.auth_throttle_wait(array[:'k_email']), 0, 'sin fallos, no hay que esperar');

select public.auth_throttle_fail(:'k_email', 5, '15 minutes', '15 minutes') from generate_series(1, 4);
select is(public.auth_throttle_wait(array[:'k_email']), 0, 'con 4 fallos todavía puede intentar');

select public.auth_throttle_fail(:'k_email', 5, '15 minutes', '15 minutes');
select ok(public.auth_throttle_wait(array[:'k_email', :'k_ip']) between 890 and 900, 'al quinto fallo espera 15 minutos');

select public.auth_throttle_reset(:'k_email');
select is(public.auth_throttle_wait(array[:'k_email']), 0, 'un ingreso correcto lo libera');

-- Los fallos viejos (fuera de la ventana) no se acumulan.
select public.auth_throttle_fail(:'k_ip', 2, '15 minutes', '15 minutes');
update public.auth_throttle set window_started_at = now() - interval '1 hour' where key = :'k_ip';
select public.auth_throttle_fail(:'k_ip', 2, '15 minutes', '15 minutes');
select is(public.auth_throttle_wait(array[:'k_ip']), 0, 'un fallo de hace una hora ya no cuenta');

select throws_ok($$insert into public.auth_throttle (key) values ('juan@example.com')$$, '23514', null, 'solo claves hasheadas: nunca un email a la vista');
reset role;

select * from finish();
rollback;
