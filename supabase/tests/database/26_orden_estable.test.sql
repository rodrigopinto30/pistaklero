begin;
\ir ../support/helpers.inc

select plan(3);

-- Dos empresas creadas en el mismo instante y con empleos abiertos: empatan en todo menos en el id.
select tests.create_user('rrhh@uno.orden.pgtap.test') as uno \gset
select tests.create_user('rrhh@dos.orden.pgtap.test') as dos \gset
select tests.authenticate_as(:'uno');
select public.create_company('Orden Uno Pgtap', 'https://uno.orden.pgtap.test', 'es') as c1 \gset
reset role;
select tests.authenticate_as(:'dos');
select public.create_company('Orden Dos Pgtap', 'https://dos.orden.pgtap.test', 'es') as c2 \gset
reset role;
update public.companies set created_at = '2026-01-01' where id in (:'c1', :'c2');
insert into public.jobs (company_id, title, description, language, seniority, employment_type, work_mode,
  salary_min, salary_max, salary_currency, salary_period, salary_basis, valid_through, status)
select c, 'Oferta orden', 'Oferta.', 'es', 'junior', 'full_time', 'remote', 1000, 1500, 'USD', 'month', 'gross', now() + interval '30 days', 'published'
from unnest(array[:'c1', :'c2']::uuid[]) c;

select tests.create_profile('ana@orden.pgtap.test', 'candidate') as ana \gset
select tests.authenticate_as(:'ana');

create temp table antes as select array_agg(id) as ids from public.company_cards('orden') ;
select is((select array_agg(id) from public.company_cards('orden')), (select ids from antes), 'el mismo pedido da siempre el mismo orden');

-- Like y guardar a la que va última: no sube.
select public.toggle_company_like(ids[2]) from antes;
select public.toggle_saved_company(ids[2]) from antes;
select is((select array_agg(id) from public.company_cards('orden')), (select ids from antes), 'un like o guardar no mueve las tarjetas');

select is((select ids from antes), (select array_agg(x order by x) from unnest(array[:'c1', :'c2']::uuid[]) x), 'entre empates, desempata el id');
reset role;

select * from finish();
rollback;
