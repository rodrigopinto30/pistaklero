begin;
\ir ../support/helpers.inc

select plan(11);

select tests.create_user('ana.maria@people.pgtap.test') as ana \gset
select tests.create_user('beto@people.pgtap.test') as beto \gset
select tests.create_user('rrhh@people.pgtap.test') as rrhh \gset

-- Nombre, segundo nombre y apellido por separado ----------------------------------
select tests.authenticate_as(:'ana');
select public.onboard_candidate('  Ana ', 'María', ' Pérez ', 'Frontend', 'es');
select results_eq(
  $$select first_name, middle_name, last_name, full_name from public.people where user_id = auth.uid()$$,
  $$values ('Ana', 'María', 'Pérez', 'Ana María Pérez')$$,
  'guarda cada parte del nombre en su campo y arma el nombre completo'
);
select throws_ok($$select public.save_my_name('Ana', '', '  ')$$, 'P0001', 'invalid_name', 'el apellido es obligatorio');
select throws_ok($$select public.save_my_name(repeat('a', 51), '', 'Pérez')$$, 'P0001', 'invalid_name', 'cada parte tiene hasta 50 caracteres');
select lives_ok($$select public.save_my_name('Ana', '', 'Gómez')$$, 'se puede cambiar el nombre');
select is((select full_name from public.people where user_id = auth.uid()), 'Ana Gómez', 'sin segundo nombre no quedan espacios dobles');
select throws_ok(
  $$update public.people set first_name = 'Otra' where user_id = auth.uid()$$,
  '42501', null, 'la tabla no se edita directo: solo con save_my_name'
);
update public.candidates set visibility = 'hidden' where user_id = auth.uid();
reset role;

-- Visibilidad: la misma que la del perfil -----------------------------------------
select tests.authenticate_as(:'beto');
select public.onboard_candidate('Beto', '', 'Ruiz', '', 'es');
select is((select count(*)::int from public.people where user_id = :'ana'), 0, 'otra persona no ve el nombre de un perfil oculto');
reset role;

select tests.authenticate_as(:'ana');
update public.candidates set visibility = 'public' where user_id = auth.uid();
reset role;
select tests.authenticate_as_anon();
select is((select full_name from public.people where user_id = :'ana'), 'Ana Gómez', 'el nombre de un perfil público se ve sin sesión');
select throws_ok($$select public.save_my_name('Intrusa', '', 'Anónima')$$, '42501', null, 'un visitante no puede guardar un nombre');
reset role;

-- Bienvenida del reclutador: nombre y empresa, todo o nada --------------------------
select tests.authenticate_as(:'rrhh');
select public.create_company('Ya Existe People', 'https://ya-existe.people.pgtap.test', 'es') is not null as created;
reset role;
select tests.create_user('otra@people.pgtap.test') as otra \gset
select tests.authenticate_as(:'otra');
select throws_ok(
  $$select public.onboard_recruiter('Otra', '', 'Persona', 'Copia', 'https://ya-existe.people.pgtap.test', 'es')$$,
  'P0001', 'company_exists', 'si la empresa ya existe, falla'
);
select is((select count(*)::int from public.people where user_id = auth.uid()), 0, 'y tampoco queda guardado el nombre');
reset role;

select * from finish();
rollback;
