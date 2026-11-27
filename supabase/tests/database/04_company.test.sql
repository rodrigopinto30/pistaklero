begin;
\ir ../support/helpers.inc

select plan(13);

select tests.create_user('rrhh@acme.pgtap.test') as acme \gset
select tests.authenticate_as(:'acme');
select public.create_company('Acme', 'https://acme.pgtap.test', 'es') as acme_company \gset
reset role;

select tests.create_user('rrhh@globex.pgtap.test') as globex \gset
select tests.authenticate_as(:'globex');
select public.create_company('Globex', 'https://globex.pgtap.test', 'es') as globex_company \gset
reset role;

-- Edición
select tests.authenticate_as(:'acme');
select lives_ok($$update public.companies set description = 'Hacemos cohetes', stage = 'seed' where id = public.my_company_id()$$,
  'un miembro edita la descripción y la etapa');
select throws_ok($$update public.companies set website_url = 'https://otra.pgtap.test' where id = public.my_company_id()$$,
  '42501', null, 'el sitio web no se edita directo');
select throws_ok($$update public.companies set logo_path = 'cualquier/cosa.webp' where id = public.my_company_id()$$,
  '42501', null, 'el logo no se asigna directo');

-- Sitio web
select throws_ok($$select public.update_company_website('https://globex.pgtap.test')$$,
  'P0001', 'company_exists', 'no se puede usar el dominio de otra empresa');
select throws_ok($$select public.update_company_website('http://acme.pgtap.test')$$,
  'P0001', 'invalid_url', 'solo sitios https');
select lives_ok($$select public.update_company_website('https://acme-nuevo.pgtap.test/')$$, 'cambia a un dominio nuevo');
reset role;
select is((select verified_at from public.companies where id = :'acme_company'), null,
  'con un dominio que no coincide con su email, la empresa pierde la verificación');

select tests.authenticate_as(:'acme');
select public.update_company_website('https://www.acme.pgtap.test');
reset role;
select isnt((select verified_at from public.companies where id = :'acme_company'), null,
  'al volver a su dominio, se verifica de nuevo');
select is((select count(*)::int from public.audit_log where target_id = :'acme_company' and action = 'company.domain_changed'), 2,
  'cada cambio de dominio queda auditado');

-- Logo
select tests.authenticate_as(:'acme');
select throws_ok(format($$select public.set_company_logo('%s/%s.webp')$$, :'globex_company', repeat('a', 32)),
  'P0001', 'invalid_path', 'no se puede apuntar al logo de otra empresa');
select lives_ok(format($$select public.set_company_logo('%s/%s.webp')$$, :'acme_company', repeat('b', 32)),
  'asigna un logo dentro de su carpeta');

-- Stack
select lives_ok($$insert into public.company_skills (company_id, skill_id) select public.my_company_id(), id from public.skills where slug = 'react'$$,
  'un miembro agrega tecnologías al stack');
select throws_ok(format($$insert into public.company_skills (company_id, skill_id) select %L, id from public.skills where slug = 'vue'$$, :'globex_company'),
  '42501', null, 'nadie edita el stack de otra empresa');
reset role;

select * from finish();
rollback;
