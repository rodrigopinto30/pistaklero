begin;
\ir ../support/helpers.inc

select plan(10);

select tests.create_profile('ana@pgtap.test', 'candidate') as ana \gset
select tests.create_profile('beto@pgtap.test', 'recruiter') as beto \gset
select tests.create_profile('admin@pgtap.test', 'admin') as admin \gset

-- Visitante anónimo
select tests.authenticate_as_anon();
select throws_ok(
  'select * from public.profiles',
  '42501',
  null,
  'un visitante anónimo no puede leer perfiles'
);
reset role;

-- Candidata
select tests.authenticate_as(:'ana');
select results_eq(
  'select id from public.profiles',
  array[:'ana'::uuid],
  'cada usuario ve solo su propio perfil'
);
select is(public.auth_role(), 'candidate'::public.user_role, 'auth_role() devuelve el rol propio');
select is(public.is_admin(), false, 'una candidata no es admin');

select throws_ok(
  $$update public.profiles set role = 'admin' where id = auth.uid()$$,
  '42501',
  null,
  'nadie puede cambiar su propio rol'
);

select lives_ok(
  $$update public.profiles set locale = 'en', email_notifications = false, message_enter_sends = false where id = auth.uid()$$,
  'cada usuario puede cambiar sus preferencias'
);

select throws_ok(
  format('insert into public.profiles (id, role) values (%L, %L)', gen_random_uuid(), 'admin'),
  '42501',
  null,
  'nadie puede crear perfiles directamente'
);

update public.profiles set locale = 'en' where id = :'beto';
reset role;
select is(
  (select locale from public.profiles where id = :'beto'),
  'es'::public.app_locale,
  'nadie puede modificar el perfil de otro'
);

-- Admin: ve todos los perfiles que existen (sin depender de los datos que ya haya en la base).
select count(*)::int as total_profiles from public.profiles \gset
select tests.authenticate_as(:'admin');
select is((select count(*)::int from public.profiles), :total_profiles, 'el admin ve todos los perfiles');
reset role;

-- Cuenta suspendida
update public.profiles set suspended_at = now() where id = :'ana';
select tests.authenticate_as(:'ana');
select is(public.auth_role(), null, 'una cuenta suspendida no tiene rol efectivo');
reset role;

select * from finish();
rollback;
