begin;
\ir ../support/helpers.inc

select plan(6);

select tests.create_user('ana@datos.pgtap.test') as ana \gset
select tests.authenticate_as(:'ana');
select public.onboard_candidate('Ana', '', 'Pérez', 'Frontend', 'es');
insert into public.candidate_projects (candidate_id, title) values (auth.uid(), 'Mi portfolio');
select is((public.export_my_data() -> 'person' ->> 'last_name'), 'Pérez', 'la exportación incluye los datos personales');
select is(jsonb_array_length(public.export_my_data() -> 'projects'), 1, 'y los bloques del perfil');
select is((public.export_my_data() -> 'account' ->> 'email'), 'ana@datos.pgtap.test', 'y el email de la cuenta');
reset role;

select tests.authenticate_as_anon();
select throws_ok('select public.export_my_data()', '42501', null, 'un visitante anónimo no exporta nada');
reset role;

-- Borrar la cuenta del único miembro deja la empresa sin reclamar
select tests.create_user('rrhh@datos.pgtap.test') as owner \gset
select tests.authenticate_as(:'owner');
select public.create_company('Datos', 'https://datos.pgtap.test', 'es') as company \gset
reset role;
delete from auth.users where id = :'owner';
select is((select status from public.companies where id = :'company'), 'unclaimed'::public.company_status, 'la empresa sin miembros queda sin reclamar');

-- Borrar la cuenta borra en cascada sus datos
delete from auth.users where id = :'ana';
select is((select count(*)::int from public.candidate_projects where candidate_id = :'ana'), 0, 'borrar la cuenta borra sus datos');

select * from finish();
rollback;
