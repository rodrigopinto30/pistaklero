begin;
\ir ../support/helpers.inc

select plan(9);

select tests.create_user('rrhh@vistas.pgtap.test') as recruiter \gset
select tests.authenticate_as(:'recruiter');
select public.create_company('Vistas', 'https://vistas.pgtap.test', 'es') as company \gset
reset role;

select tests.create_user('ana@vistas.pgtap.test') as ana \gset
select tests.authenticate_as(:'ana');
select public.onboard_candidate('Ana', '', 'Vistas', 'Frontend', 'es');
reset role;
update public.candidates set slug = 'ana-vistas-pgtap' where user_id = :'ana';

-- Sin registrar la vista, ni siquiera por la API se lee el perfil "solo empresas"
select tests.authenticate_as(:'recruiter');
select is((select count(*)::int from public.candidates where user_id = :'ana'), 0, 'sin registrar la vista, el reclutador no ve el perfil');
select is(public.register_profile_view('ana-vistas-pgtap'), 'ok', 'registra la vista');
select is((select count(*)::int from public.candidates where user_id = :'ana'), 1, 'con la vista registrada, lo ve');
select is(public.register_profile_view('ana-vistas-pgtap'), 'ok', 'volver a verlo el mismo día no cuenta de nuevo');
reset role;
select is((select count(*)::int from public.candidate_profile_views where viewer_id = :'recruiter'), 1, 'queda una sola vista');

-- Con 200 vistas en el día, no puede ver perfiles nuevos
create function pg_temp.fill(p_viewer uuid, p_n int) returns void language plpgsql as $$
declare v uuid;
begin
  for i in 1..p_n loop
    v := tests.create_user('relleno' || i || '@vistas.pgtap.test');
    insert into public.profiles (id, role) values (v, 'candidate');
    insert into public.people (user_id, first_name, last_name) values (v, 'Relleno', 'Prueba');
    insert into public.candidates (user_id, slug) values (v, 'relleno-' || i || '-pgtap');
    insert into public.candidate_profile_views (viewer_id, candidate_id) values (p_viewer, v);
  end loop;
end $$;
select pg_temp.fill(:'recruiter', 199);

select tests.create_user('beto@vistas.pgtap.test') as beto \gset
select tests.authenticate_as(:'beto');
select public.onboard_candidate('Beto', '', 'Vistas', 'Backend', 'es');
reset role;
update public.candidates set slug = 'beto-vistas-pgtap' where user_id = :'beto';

select tests.authenticate_as(:'recruiter');
select is(public.register_profile_view('beto-vistas-pgtap'), 'limit', 'al llegar a 200 vistas en el día, frena');
select is((select count(*)::int from public.candidates where user_id = :'beto'), 0, 'y el perfil nuevo no se puede leer');
reset role;

-- Quien se postuló a la empresa se ve siempre, aunque se haya llegado al límite
insert into public.jobs (company_id, title, language, seniority, employment_type, work_mode, salary_min, salary_max,
  salary_currency, salary_period, salary_basis, valid_through, status)
values (:'company', 'Oferta de vistas', 'es', 'junior', 'full_time', 'remote', 1000, 1500, 'USD', 'month', 'gross', now() + interval '30 days', 'published')
returning id as job \gset
insert into public.applications (job_id, candidate_id) values (:'job', :'beto');
select tests.authenticate_as(:'recruiter');
select is((select count(*)::int from public.candidates where user_id = :'beto'), 1, 'a quien se postuló lo ve sin contar vistas');
reset role;

-- La tarea diaria borra las vistas de más de 30 días
insert into public.candidate_profile_views (viewer_id, candidate_id, viewed_on) values (:'recruiter', :'beto', current_date - 40);
select public.daily_maintenance();
select is((select count(*)::int from public.candidate_profile_views where viewed_on < current_date - 30), 0, 'la tarea diaria borra las vistas viejas');

select * from finish();
rollback;
