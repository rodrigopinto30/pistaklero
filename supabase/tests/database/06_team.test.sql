begin;
\ir ../support/helpers.inc

select plan(13);

select tests.create_user('owner@acme.pgtap.test') as owner \gset
select tests.authenticate_as(:'owner');
select public.create_company('Acme', 'https://acme.pgtap.test', 'es') as company \gset
reset role;

-- El token real lo genera la app; acá usamos uno fijo y su hash.
\set token 'token-secreto-de-prueba'
select encode(extensions.digest(:'token', 'sha256'), 'hex') as token_hash \gset

select tests.authenticate_as(:'owner');
select lives_ok(format($$select public.create_invitation('Nueva@Acme.pgtap.test', %L)$$, :'token_hash'), 'el owner invita por email');
select throws_ok($$select public.create_invitation('x@acme.pgtap.test', 'no-es-un-hash')$$, 'P0001', 'invalid_token', 'el hash tiene que ser SHA-256');
select throws_ok($$select public.create_invitation('owner@acme.pgtap.test', repeat('a', 64))$$, 'P0001', 'already_member', 'no se invita a alguien que ya es miembro');
select is((select count(*)::int from public.company_invitations), 1, 'el owner ve sus invitaciones');
reset role;

-- Otra persona con otro email no puede usarla
select tests.create_user('intrusa@pgtap.test') as intrusa \gset
select tests.authenticate_as(:'intrusa');
select throws_ok(format($$select public.accept_invitation(%L, 'es')$$, :'token'), 'P0001', 'email_mismatch', 'solo la acepta el email invitado');
select throws_ok($$select public.accept_invitation('token-inventado', 'es')$$, 'P0001', 'invalid_invitation', 'un token inventado no sirve');
reset role;

-- La persona invitada
select tests.create_user('nueva@acme.pgtap.test') as nueva \gset
select tests.authenticate_as(:'nueva');
select is(public.accept_invitation(:'token', 'es'), :'company'::uuid, 'el email invitado acepta y entra a la empresa');
select is(public.auth_role(), 'recruiter'::public.user_role, 'queda como reclutadora');
select throws_ok(format($$select public.accept_invitation(%L, 'es')$$, :'token'), 'P0001', 'invalid_invitation', 'el token no se puede usar dos veces');
select throws_ok(format($$select public.create_invitation('otro@acme.pgtap.test', %L)$$, repeat('b', 64)), 'P0001', 'not_authorized', 'un miembro común no invita');
select is((select count(*)::int from public.list_company_members()), 2, 'los miembros ven al equipo');
reset role;

-- Gestión de miembros
select tests.authenticate_as(:'owner');
select throws_ok(format($$select public.update_member(%L, 'remove')$$, :'owner'), 'P0001', 'cannot_change_self', 'el owner no se quita a sí mismo');
select lives_ok(format($$select public.update_member(%L, 'remove')$$, :'nueva'), 'el owner quita a un miembro');
reset role;

select * from finish();
rollback;
