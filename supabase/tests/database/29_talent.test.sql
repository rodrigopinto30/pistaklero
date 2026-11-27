begin;
\ir ../support/helpers.inc

select plan(6);

select tests.create_user('rrhh@talento.pgtap.test') as owner \gset
select tests.authenticate_as(:'owner');
select public.create_company('Talento Pgtap', 'https://talento.pgtap.test', 'es') as company \gset
reset role;

-- Tres candidatas: pública, solo empresas y oculta.
select tests.create_profile('pub@talento.pgtap.test', 'candidate') as pub \gset
select tests.create_profile('emp@talento.pgtap.test', 'candidate') as emp \gset
select tests.create_profile('oculta@talento.pgtap.test', 'candidate') as oculta \gset
insert into public.people (user_id, first_name, last_name) values
  (:'pub', 'Paula', 'Talentopgtap'), (:'emp', 'Ema', 'Talentopgtap'), (:'oculta', 'Olga', 'Talentopgtap');
insert into public.candidates (user_id, slug, headline, visibility) values
  (:'pub', 'pub-talento-pgtap', 'Frontend', 'public'),
  (:'emp', 'emp-talento-pgtap', 'Backend', 'companies_only'),
  (:'oculta', 'oculta-talento-pgtap', 'Datos', 'hidden');
insert into public.candidate_skills (candidate_id, skill_id) select :'pub', id from public.skills where slug = 'react';

select tests.authenticate_as(:'owner');
select is((select count(*)::int from public.talent_cards('talentopgtap')), 2, 'la empresa ve a quienes no se ocultaron');
select is((select full_name from public.talent_cards('talentopgtap', 'react')), 'Paula Talentopgtap', 'filtra por habilidad');
reset role;

-- Si la candidata bloquea a la empresa, deja de aparecer.
insert into public.candidate_blocked_companies (candidate_id, company_id) values (:'emp', :'company');
select tests.authenticate_as(:'owner');
select is((select count(*)::int from public.talent_cards('talentopgtap')), 1, 'los bloqueos se respetan');
reset role;

-- Ni candidatas ni visitantes pueden explorar.
select tests.authenticate_as(:'pub');
select throws_ok($$select * from public.talent_cards()$$, 'P0001', 'not_authorized', 'una candidata no explora talento');
reset role;
select tests.authenticate_as_anon();
select throws_ok($$select * from public.talent_cards()$$, '42501', null, 'un visitante tampoco');
reset role;

select tests.authenticate_as(:'owner');
select is((select count(*)::int from public.talent_cards('talentopgtap', p_availability => 'not_looking')), 0, 'filtra por disponibilidad');
reset role;

select * from finish();
rollback;
