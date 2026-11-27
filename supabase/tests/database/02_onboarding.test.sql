begin;
\ir ../support/helpers.inc

select plan(22);

-- Utilidades ------------------------------------------------------------------
select is(public.slugify('Ana Pérez Ñandú!'), 'ana-perez-nandu', 'slugify quita acentos y símbolos');
select matches(public.random_slug('Ana Pérez'), '^ana-perez-[0-9a-f]{6}$', 'random_slug agrega un sufijo aleatorio');
select is(public.domain_from_url('https://www.Acme.com/empleos?x=1'), 'acme.com', 'domain_from_url extrae el dominio');
select is(public.domain_from_url('no es una url'), null, 'domain_from_url devuelve null si no es una URL');
select ok(public.email_matches_domain('ana@ar.acme.com', 'acme.com'), 'un subdominio del email verifica');
select ok(not public.email_matches_domain('ana@gmail.com', 'gmail.com'), 'un dominio gratuito nunca verifica');

-- Bienvenida de candidata -------------------------------------------------------
select tests.create_user('ana@pgtap.test') as ana \gset

select tests.authenticate_as_anon();
select throws_ok(
  $$select public.onboard_candidate('Intrusa', '', 'Prueba', '', 'es')$$,
  '42501', null, 'un visitante anónimo no puede hacer la bienvenida'
);
reset role;

select tests.authenticate_as(:'ana');
select lives_ok($$select public.onboard_candidate('Ana', '', 'Pérez', 'Frontend Junior', 'es')$$, 'una cuenta nueva elige ser candidata');
select is(public.auth_role(), 'candidate'::public.user_role, 'queda con rol candidate');
select matches((select slug::text from public.candidates where user_id = auth.uid()), '^ana-perez-', 'su perfil tiene un slug legible');
select throws_ok(
  $$select public.onboard_candidate('Ana', '', 'Prueba', '', 'es')$$,
  'P0001', 'already_onboarded', 'la bienvenida se hace una sola vez'
);
select throws_ok(
  $$update public.candidates set slug = 'otro' where user_id = auth.uid()$$,
  '42501', null, 'el slug no se puede editar'
);
reset role;

-- Bienvenida de empresas ------------------------------------------------------------
select tests.create_user('rrhh@acme.pgtap.test') as acme \gset
select tests.authenticate_as(:'acme');
select public.create_company('Acme', 'https://www.acme.pgtap.test', 'es') as acme_company \gset
reset role;
select isnt((select verified_at from public.companies where id = :'acme_company'), null, 'un email del dominio verifica la empresa');
select is(
  (select member_role from public.company_members where user_id = :'acme'),
  'owner'::public.member_role,
  'quien crea la empresa queda como owner'
);

select tests.create_user('fundador@gmail.com') as gmail \gset
select tests.authenticate_as(:'gmail');
select public.create_company('Startup Uno', 'https://startup-uno.io', 'es') as gmail_company \gset
reset role;
select is((select verified_at from public.companies where id = :'gmail_company'), null, 'con un email gratuito la empresa queda sin verificar');

select tests.create_user('otro@acme.pgtap.test') as acme2 \gset
select tests.authenticate_as(:'acme2');
select throws_ok(
  $$select public.create_company('Acme Copia', 'https://acme.pgtap.test', 'es')$$,
  'P0001', 'company_exists', 'no se crean dos empresas con el mismo dominio'
);
reset role;

-- Visibilidad de perfiles -----------------------------------------------------------
select tests.create_profile('beto@pgtap.test', 'candidate') as beto \gset

select tests.authenticate_as(:'beto');
select is((select count(*)::int from public.candidates where user_id = :'ana'), 0, 'otra candidata no ve un perfil "solo empresas"');
reset role;

-- El reclutador registra la vista del día (límite de 200 por día; ver 18_profile_views).
select slug as ana_slug from public.candidates where user_id = :'ana' \gset
select tests.authenticate_as(:'acme');
select public.register_profile_view(:'ana_slug') = 'ok' as registered;
select is((select count(*)::int from public.candidates where user_id = :'ana'), 1, 'un reclutador sí lo ve');
reset role;

update public.candidates set visibility = 'public' where user_id = :'ana';
select tests.authenticate_as_anon();
select is((select count(*)::int from public.candidates where user_id = :'ana'), 1, 'un perfil público lo ve cualquiera');
select is((select count(*)::int from public.companies where id = :'acme_company'), 1, 'las empresas activas son públicas');
reset role;

-- Edición de empresas ----------------------------------------------------------------
select tests.authenticate_as(:'gmail');
update public.companies set name = 'Hackeada' where id = :'acme_company';
reset role;
select is((select name from public.companies where id = :'acme_company'), 'Acme', 'nadie edita una empresa ajena');

select tests.authenticate_as(:'acme');
select throws_ok(
  format('update public.companies set verified_at = now() where id = %L', :'gmail_company'),
  '42501', null, 'nadie puede marcarse como verificado'
);
reset role;

select * from finish();
rollback;
