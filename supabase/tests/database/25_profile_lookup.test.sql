begin;
\ir ../support/helpers.inc

select plan(5);

select tests.create_user('oculta@lookup.pgtap.test') as hidden \gset
select tests.create_user('publica@lookup.pgtap.test') as shown \gset
select tests.authenticate_as(:'hidden');
select public.onboard_candidate('Olga', '', 'Oculta', '', 'es');
update public.candidates set visibility = 'hidden' where user_id = auth.uid();
reset role;
select tests.authenticate_as(:'shown');
select public.onboard_candidate('Pablo', '', 'Publico', '', 'es');
update public.candidates set visibility = 'public' where user_id = auth.uid();
reset role;

select slug as hidden_slug from public.candidates where user_id = :'hidden' \gset
select slug as shown_slug from public.candidates where user_id = :'shown' \gset

select tests.authenticate_as_anon();
select is(public.visible_candidate_id(:'shown_slug'), :'shown'::uuid, 'un perfil público se encuentra por su slug');
select is(public.visible_candidate_id(:'hidden_slug'), null, 'uno oculto no: ni siquiera se sabe que existe');
select is((select count(*)::int from public.candidates where user_id in (:'shown', :'hidden')), 1, 'sin sesión solo se ve el público');
select is((select count(*)::int from public.people where user_id in (:'shown', :'hidden')), 1, 'y solo el nombre del público');
reset role;

select tests.authenticate_as(:'hidden');
select is(public.visible_candidate_id(:'hidden_slug'), :'hidden'::uuid, 'cada uno ve su propio perfil oculto');
reset role;

select * from finish();
rollback;
