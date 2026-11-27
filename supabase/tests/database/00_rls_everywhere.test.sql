-- Ninguna tabla del esquema public puede quedar sin RLS.
begin;
\ir ../support/helpers.inc

select plan(1);

select is(
  array(
    select c.relname::text
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
    order by 1
  ),
  array[]::text[],
  'todas las tablas de public tienen RLS activado'
);

select * from finish();
rollback;
