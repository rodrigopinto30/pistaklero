begin;
\ir ../support/helpers.inc

select plan(7);

select tests.create_profile('admin@claim.pgtap.test', 'admin') as admin \gset
select tests.authenticate_as(:'admin');
select public.admin_upsert_unclaimed_company('Reclamable SA', 'https://reclamable.pgtap.test/careers') as company \gset
reset role;

-- Con un email de otro dominio no se puede reclamar
select tests.create_user('intrusa@otro.pgtap.test') as intruder \gset
select tests.authenticate_as(:'intruder');
select throws_ok($$select public.create_company('Reclamable', 'https://reclamable.pgtap.test', 'es')$$, 'P0001', 'company_unclaimed',
  'sin un email del dominio, la empresa no se reclama');
reset role;

-- Con un email verificado del dominio, se reclama automáticamente
select tests.create_user('fundadora@reclamable.pgtap.test') as founder \gset
select tests.authenticate_as(:'founder');
select is(public.create_company('Reclamable', 'https://www.reclamable.pgtap.test', 'es'), :'company'::uuid, 'devuelve la empresa existente');
reset role;
select is((select status from public.companies where id = :'company'), 'active'::public.company_status, 'la empresa queda activa');
select isnt((select verified_at from public.companies where id = :'company'), null, 'y verificada');
select is((select member_role from public.company_members where user_id = :'founder'), 'owner'::public.member_role, 'quien la reclama queda como owner');
select is((select count(*)::int from public.audit_log where action = 'company.claimed' and target_id = :'company'), 1, 'el reclamo queda en la auditoría');

-- Una empresa ya reclamada no se puede volver a reclamar
select tests.create_user('otra@reclamable.pgtap.test') as second \gset
select tests.authenticate_as(:'second');
select throws_ok($$select public.create_company('Reclamable', 'https://reclamable.pgtap.test', 'es')$$, 'P0001', 'company_exists',
  'una empresa activa no se reclama: se pide una invitación');
reset role;

select * from finish();
rollback;
