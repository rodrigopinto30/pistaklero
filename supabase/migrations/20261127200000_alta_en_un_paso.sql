-- Alta en un paso: mientras la empresa (o la candidata) no termina de armar su página, el panel
-- muestra un único formulario con "Finalizar registro". Después, cada sección se edita por separado.

alter table public.companies add column setup_completed_at timestamptz;
alter table public.candidates add column setup_completed_at timestamptz;

-- Lo que ya existe se considera armado: el alta en un paso es para las cuentas nuevas.
update public.companies set setup_completed_at = coalesce(updated_at, now());
update public.candidates set setup_completed_at = now();

-- Solo se marca con las funciones de abajo (no con un update directo).
revoke update (setup_completed_at) on public.companies from authenticated;
revoke update (setup_completed_at) on public.candidates from authenticated;

create function public.complete_company_setup()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid := public.my_company_id();
begin
  if v_company_id is null then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
  update public.companies set setup_completed_at = coalesce(setup_completed_at, now()) where id = v_company_id;
end;
$$;

create function public.complete_candidate_setup()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.candidates set setup_completed_at = coalesce(setup_completed_at, now())
  where user_id = (select auth.uid());
  if not found then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function public.complete_company_setup() from public, anon;
revoke execute on function public.complete_candidate_setup() from public, anon;
grant execute on function public.complete_company_setup() to authenticated;
grant execute on function public.complete_candidate_setup() to authenticated;
