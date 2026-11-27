begin;
\ir ../support/helpers.inc

select plan(6);

select tests.create_user('foto@avatar.pgtap.test') as ana \gset
select tests.create_user('otra@avatar.pgtap.test') as otra \gset

select tests.authenticate_as(:'ana');
select throws_ok($$select public.set_my_avatar(auth.uid()::text || '/' || repeat('a', 32) || '.webp')$$, 'P0001', 'no_person', 'sin datos personales no hay dónde guardar la foto');
select public.onboard_candidate('Ana', '', 'Foto', '', 'es');
select lives_ok($$select public.set_my_avatar(auth.uid()::text || '/' || repeat('a', 32) || '.webp')$$, 'guarda una foto de su carpeta');
select is((select avatar_path from public.people where user_id = auth.uid()), :'ana' || '/' || repeat('a', 32) || '.webp', 'la ruta queda en sus datos personales');
select throws_ok(format($$select public.set_my_avatar(%L)$$, :'otra' || '/' || repeat('b', 32) || '.webp'), 'P0001', 'invalid_path', 'no puede apuntar a la carpeta de otra persona');
select throws_ok($$select public.set_my_avatar('../../etc/passwd')$$, 'P0001', 'invalid_path', 'solo acepta rutas con el formato esperado');
select lives_ok($$select public.set_my_avatar('')$$, 'texto vacío quita la foto');
reset role;

select * from finish();
rollback;
