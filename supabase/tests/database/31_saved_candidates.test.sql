begin;
\ir ../support/helpers.inc

select plan(9);

select tests.create_user('rrhh@guardados.pgtap.test') as owner \gset
select tests.authenticate_as(:'owner');
select public.create_company('Guardados Pgtap', 'https://guardados.pgtap.test', 'es') as company \gset
reset role;
insert into public.people (user_id, first_name, last_name) values (:'owner', 'Rita', 'Guarda')
  on conflict (user_id) do update set first_name = excluded.first_name, last_name = excluded.last_name;

select tests.create_profile('pub@guardados.pgtap.test', 'candidate') as pub \gset
select tests.create_profile('oculta@guardados.pgtap.test', 'candidate') as oculta \gset
insert into public.people (user_id, first_name, last_name) values (:'pub', 'Paula', 'Guardadapgtap'), (:'oculta', 'Olga', 'Guardadapgtap');
insert into public.candidates (user_id, slug, headline, visibility) values
  (:'pub', 'pub-guardados-pgtap', 'Frontend', 'companies_only'),
  (:'oculta', 'oculta-guardados-pgtap', 'Datos', 'hidden');

select tests.authenticate_as(:'owner');
select ok(public.toggle_saved_candidate(:'pub'), 'la empresa guarda un perfil');
select ok(public.is_candidate_saved(:'pub'), 'queda guardado');
select is((select saved_by_name from public.saved_candidate_cards() where user_id = :'pub'), 'Rita Guarda', 'la lista dice quién lo guardó');
select ok((select saved from public.talent_cards('guardadapgtap') where user_id = :'pub'), 'Talento muestra que ya está guardado');
select throws_ok(format($$select public.toggle_saved_candidate(%L)$$, :'oculta'), 'P0001', 'not_found', 'un perfil oculto no se puede guardar');
reset role;

-- Si la persona bloquea a la empresa, desaparece de la lista.
insert into public.candidate_blocked_companies (candidate_id, company_id) values (:'pub', :'company');
select tests.authenticate_as(:'owner');
select is((select count(*)::int from public.saved_candidate_cards()), 0, 'un bloqueo la saca de la lista');
reset role;
delete from public.candidate_blocked_companies where candidate_id = :'pub';

select tests.authenticate_as(:'owner');
select ok(not public.toggle_saved_candidate(:'pub'), 'tocar de nuevo la deja de guardar');
reset role;

-- Una candidata no guarda perfiles; nadie ve la tabla directo.
select tests.authenticate_as(:'pub');
select throws_ok($$select public.toggle_saved_candidate(gen_random_uuid())$$, 'P0001', 'not_authorized', 'una candidata no guarda perfiles');
select throws_ok($$select * from public.saved_candidates$$, '42501', null, 'la tabla no se lee directo');
reset role;

select * from finish();
rollback;
