-- Ayudantes para los tests de pgTAP. Se incluyen al principio de cada test con:
--   \ir support/helpers.inc
-- Todo vive dentro de la transacción del test y se descarta al final.

set client_min_messages = warning;
create extension if not exists pgtap with schema extensions;

create schema if not exists tests;
grant usage on schema tests to anon, authenticated;

-- Crea un usuario de auth y devuelve su id.
create or replace function tests.create_user(p_email text)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email, now(),
          '{"provider":"email","providers":["email"]}', '{}', now(), now());
  return v_id;
end;
$$;

-- Crea un usuario con perfil (salta la bienvenida).
create or replace function tests.create_profile(p_email text, p_role public.user_role)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := tests.create_user(p_email);
begin
  insert into public.profiles (id, role) values (v_id, p_role);
  return v_id;
end;
$$;

-- Actúa como ese usuario autenticado hasta el próximo `reset role`.
create or replace function tests.authenticate_as(p_user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- Actúa como visitante anónimo hasta el próximo `reset role`.
create or replace function tests.authenticate_as_anon()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('role', 'anon', true);
end;
$$;

grant execute on all functions in schema tests to anon, authenticated;
