-- Perfil del candidato: habilidades, bloques (experiencia, formación, certificaciones, proyectos),
-- expectativa salarial y empresas bloqueadas.

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

create type public.skill_level as enum ('basic', 'intermediate', 'advanced', 'expert');
create type public.skill_category as enum ('language', 'framework', 'tool', 'data', 'design', 'marketing', 'soft');
create type public.currency as enum ('USD', 'ARS', 'EUR', 'BRL', 'MXN', 'CLP', 'COP', 'UYU');
create type public.salary_period as enum ('hour', 'month', 'year');
create type public.salary_basis as enum ('gross', 'net');
create type public.salary_visibility as enum ('private', 'applied_companies');

-- Límite de filas por candidato. Uso: trigger ... execute function public.enforce_row_limit('20').
create function public.enforce_row_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_limit int := tg_argv[0]::int;
  v_count int;
begin
  execute format('select count(*) from %I.%I where candidate_id = $1', tg_table_schema, tg_table_name)
    into v_count using new.candidate_id;
  if v_count >= v_limit then
    raise exception 'limit_reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Catálogo de habilidades (lo administra el admin)
-- ---------------------------------------------------------------------------

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  slug extensions.citext not null unique,
  name_es text not null check (char_length(name_es) between 1 and 60),
  name_en text not null check (char_length(name_en) between 1 and 60),
  category public.skill_category not null
);

alter table public.skills enable row level security;
revoke all on public.skills from anon, authenticated;
grant select on public.skills to anon, authenticated;
grant insert, update, delete on public.skills to authenticated;

create policy "skills: las ve cualquiera" on public.skills for select to anon, authenticated using (true);
create policy "skills: el admin las crea" on public.skills for insert to authenticated with check ((select public.is_admin()));
create policy "skills: el admin las edita" on public.skills for update to authenticated using ((select public.is_admin()));
create policy "skills: el admin las borra" on public.skills for delete to authenticated using ((select public.is_admin()));

insert into public.skills (slug, name_es, name_en, category) values
  ('javascript', 'JavaScript', 'JavaScript', 'language'),
  ('typescript', 'TypeScript', 'TypeScript', 'language'),
  ('python', 'Python', 'Python', 'language'),
  ('java', 'Java', 'Java', 'language'),
  ('go', 'Go', 'Go', 'language'),
  ('php', 'PHP', 'PHP', 'language'),
  ('ruby', 'Ruby', 'Ruby', 'language'),
  ('csharp', 'C#', 'C#', 'language'),
  ('kotlin', 'Kotlin', 'Kotlin', 'language'),
  ('swift', 'Swift', 'Swift', 'language'),
  ('sql', 'SQL', 'SQL', 'language'),
  ('html', 'HTML', 'HTML', 'language'),
  ('css', 'CSS', 'CSS', 'language'),
  ('react', 'React', 'React', 'framework'),
  ('nextjs', 'Next.js', 'Next.js', 'framework'),
  ('vue', 'Vue', 'Vue', 'framework'),
  ('angular', 'Angular', 'Angular', 'framework'),
  ('svelte', 'Svelte', 'Svelte', 'framework'),
  ('nodejs', 'Node.js', 'Node.js', 'framework'),
  ('express', 'Express', 'Express', 'framework'),
  ('nestjs', 'NestJS', 'NestJS', 'framework'),
  ('django', 'Django', 'Django', 'framework'),
  ('fastapi', 'FastAPI', 'FastAPI', 'framework'),
  ('spring', 'Spring', 'Spring', 'framework'),
  ('laravel', 'Laravel', 'Laravel', 'framework'),
  ('rails', 'Ruby on Rails', 'Ruby on Rails', 'framework'),
  ('dotnet', '.NET', '.NET', 'framework'),
  ('react-native', 'React Native', 'React Native', 'framework'),
  ('flutter', 'Flutter', 'Flutter', 'framework'),
  ('tailwindcss', 'Tailwind CSS', 'Tailwind CSS', 'framework'),
  ('git', 'Git', 'Git', 'tool'),
  ('docker', 'Docker', 'Docker', 'tool'),
  ('kubernetes', 'Kubernetes', 'Kubernetes', 'tool'),
  ('aws', 'AWS', 'AWS', 'tool'),
  ('gcp', 'Google Cloud', 'Google Cloud', 'tool'),
  ('azure', 'Azure', 'Azure', 'tool'),
  ('linux', 'Linux', 'Linux', 'tool'),
  ('graphql', 'GraphQL', 'GraphQL', 'tool'),
  ('rest-apis', 'APIs REST', 'REST APIs', 'tool'),
  ('postgresql', 'PostgreSQL', 'PostgreSQL', 'tool'),
  ('mysql', 'MySQL', 'MySQL', 'tool'),
  ('mongodb', 'MongoDB', 'MongoDB', 'tool'),
  ('redis', 'Redis', 'Redis', 'tool'),
  ('supabase', 'Supabase', 'Supabase', 'tool'),
  ('firebase', 'Firebase', 'Firebase', 'tool'),
  ('jira', 'Jira', 'Jira', 'tool'),
  ('notion', 'Notion', 'Notion', 'tool'),
  ('wordpress', 'WordPress', 'WordPress', 'tool'),
  ('shopify', 'Shopify', 'Shopify', 'tool'),
  ('hubspot', 'HubSpot', 'HubSpot', 'tool'),
  ('salesforce', 'Salesforce', 'Salesforce', 'tool'),
  ('excel', 'Excel', 'Excel', 'data'),
  ('google-sheets', 'Google Sheets', 'Google Sheets', 'data'),
  ('power-bi', 'Power BI', 'Power BI', 'data'),
  ('tableau', 'Tableau', 'Tableau', 'data'),
  ('google-analytics', 'Google Analytics', 'Google Analytics', 'data'),
  ('data-analysis', 'Análisis de datos', 'Data analysis', 'data'),
  ('machine-learning', 'Machine learning', 'Machine learning', 'data'),
  ('figma', 'Figma', 'Figma', 'design'),
  ('ui-design', 'Diseño UI', 'UI design', 'design'),
  ('ux-research', 'Investigación UX', 'UX research', 'design'),
  ('prototyping', 'Prototipado', 'Prototyping', 'design'),
  ('design-systems', 'Sistemas de diseño', 'Design systems', 'design'),
  ('web-accessibility', 'Accesibilidad web', 'Web accessibility', 'design'),
  ('photoshop', 'Photoshop', 'Photoshop', 'design'),
  ('illustrator', 'Illustrator', 'Illustrator', 'design'),
  ('canva', 'Canva', 'Canva', 'design'),
  ('video-editing', 'Edición de video', 'Video editing', 'design'),
  ('seo', 'SEO', 'SEO', 'marketing'),
  ('sem', 'SEM', 'SEM', 'marketing'),
  ('meta-ads', 'Meta Ads', 'Meta Ads', 'marketing'),
  ('google-ads', 'Google Ads', 'Google Ads', 'marketing'),
  ('content-marketing', 'Marketing de contenidos', 'Content marketing', 'marketing'),
  ('copywriting', 'Copywriting', 'Copywriting', 'marketing'),
  ('community-management', 'Community management', 'Community management', 'marketing'),
  ('email-marketing', 'Email marketing', 'Email marketing', 'marketing'),
  ('sales-prospecting', 'Prospección comercial', 'Sales prospecting', 'marketing'),
  ('customer-success', 'Customer success', 'Customer success', 'marketing'),
  ('communication', 'Comunicación', 'Communication', 'soft'),
  ('teamwork', 'Trabajo en equipo', 'Teamwork', 'soft'),
  ('problem-solving', 'Resolución de problemas', 'Problem solving', 'soft'),
  ('time-management', 'Organización del tiempo', 'Time management', 'soft'),
  ('english', 'Inglés', 'English', 'soft'),
  ('portuguese', 'Portugués', 'Portuguese', 'soft');

-- ---------------------------------------------------------------------------
-- Bloques del perfil
-- ---------------------------------------------------------------------------

create table public.candidate_skills (
  candidate_id uuid not null references public.candidates (user_id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  level public.skill_level not null default 'intermediate',
  primary key (candidate_id, skill_id)
);

create table public.candidate_experiences (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (user_id) on delete cascade,
  company_name text not null check (char_length(company_name) between 1 and 80),
  title text not null check (char_length(title) between 1 and 80),
  start_date date not null,
  end_date date check (end_date is null or end_date >= start_date),
  description text not null default '' check (char_length(description) <= 1000),
  created_at timestamptz not null default now()
);

create table public.candidate_education (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (user_id) on delete cascade,
  institution text not null check (char_length(institution) between 1 and 120),
  degree text not null check (char_length(degree) between 1 and 120),
  start_date date not null,
  end_date date check (end_date is null or end_date >= start_date),
  created_at timestamptz not null default now()
);

create table public.candidate_certifications (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (user_id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  issuer text not null default '' check (char_length(issuer) <= 120),
  issued_on date,
  credential_url text check (credential_url ~ '^https://'),
  created_at timestamptz not null default now()
);

create table public.candidate_projects (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (user_id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  url text check (url ~ '^https://'),
  repo_url text check (repo_url ~ '^https://'),
  -- Imagen de vista previa del enlace, ya recodificada y guardada en Storage.
  preview_path text,
  created_at timestamptz not null default now()
);

create trigger candidate_skills_limit before insert on public.candidate_skills
  for each row execute function public.enforce_row_limit('30');
create trigger candidate_experiences_limit before insert on public.candidate_experiences
  for each row execute function public.enforce_row_limit('20');
create trigger candidate_education_limit before insert on public.candidate_education
  for each row execute function public.enforce_row_limit('10');
create trigger candidate_certifications_limit before insert on public.candidate_certifications
  for each row execute function public.enforce_row_limit('20');
create trigger candidate_projects_limit before insert on public.candidate_projects
  for each row execute function public.enforce_row_limit('12');

create index on public.candidate_experiences (candidate_id);
create index on public.candidate_education (candidate_id);
create index on public.candidate_certifications (candidate_id);
create index on public.candidate_projects (candidate_id);

-- Permisos y políticas iguales para todos los bloques: los ve quien puede ver el perfil,
-- los edita solo su dueño.
do $$
declare
  v_table text;
begin
  foreach v_table in array array['candidate_skills', 'candidate_experiences', 'candidate_education',
                                 'candidate_certifications', 'candidate_projects']
  loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('revoke all on public.%I from anon, authenticated', v_table);
    execute format('grant select on public.%I to anon, authenticated', v_table);
    execute format('grant insert, update, delete on public.%I to authenticated', v_table);
    execute format($p$create policy "%s: según la visibilidad del perfil" on public.%I
      for select to anon, authenticated using ((select public.can_view_candidate(candidate_id)))$p$, v_table, v_table);
    execute format($p$create policy "%s: el dueño agrega" on public.%I
      for insert to authenticated
      with check (candidate_id = (select auth.uid()) and (select public.auth_role()) = 'candidate')$p$, v_table, v_table);
    execute format($p$create policy "%s: el dueño edita" on public.%I
      for update to authenticated
      using (candidate_id = (select auth.uid()) and (select public.auth_role()) = 'candidate')
      with check (candidate_id = (select auth.uid()))$p$, v_table, v_table);
    execute format($p$create policy "%s: el dueño borra" on public.%I
      for delete to authenticated
      using (candidate_id = (select auth.uid()) and (select public.auth_role()) = 'candidate')$p$, v_table, v_table);
  end loop;
end;
$$;

-- El dueño no puede pasar un bloque a otro candidato.
revoke update on public.candidate_skills from authenticated;
grant update (level) on public.candidate_skills to authenticated;
revoke update on public.candidate_experiences from authenticated;
grant update (company_name, title, start_date, end_date, description) on public.candidate_experiences to authenticated;
revoke update on public.candidate_education from authenticated;
grant update (institution, degree, start_date, end_date) on public.candidate_education to authenticated;
revoke update on public.candidate_certifications from authenticated;
grant update (name, issuer, issued_on, credential_url) on public.candidate_certifications to authenticated;
revoke update on public.candidate_projects from authenticated;
grant update (title, description, url, repo_url) on public.candidate_projects to authenticated;

-- ---------------------------------------------------------------------------
-- Expectativa salarial (tabla aparte para protegerla con su propia política)
-- ---------------------------------------------------------------------------

create table public.candidate_salary_expectations (
  candidate_id uuid primary key references public.candidates (user_id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  currency public.currency not null,
  period public.salary_period not null,
  basis public.salary_basis not null,
  visibility public.salary_visibility not null default 'private',
  updated_at timestamptz not null default now()
);

create trigger candidate_salary_expectations_updated_at before update on public.candidate_salary_expectations
  for each row execute function public.set_updated_at();

alter table public.candidate_salary_expectations enable row level security;
revoke all on public.candidate_salary_expectations from anon, authenticated;
grant select, insert, delete on public.candidate_salary_expectations to authenticated;
grant update (amount, currency, period, basis, visibility) on public.candidate_salary_expectations to authenticated;

-- Por ahora solo la ve su dueño. Las empresas donde se postuló se suman con las postulaciones.
create policy "salario: lo ve su dueño" on public.candidate_salary_expectations
  for select to authenticated using (candidate_id = (select auth.uid()));
create policy "salario: lo carga su dueño" on public.candidate_salary_expectations
  for insert to authenticated
  with check (candidate_id = (select auth.uid()) and (select public.auth_role()) = 'candidate');
create policy "salario: lo edita su dueño" on public.candidate_salary_expectations
  for update to authenticated
  using (candidate_id = (select auth.uid()) and (select public.auth_role()) = 'candidate')
  with check (candidate_id = (select auth.uid()));
create policy "salario: lo borra su dueño" on public.candidate_salary_expectations
  for delete to authenticated using (candidate_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Empresas bloqueadas: nunca ven el perfil (por ejemplo, el empleador actual)
-- ---------------------------------------------------------------------------

create table public.candidate_blocked_companies (
  candidate_id uuid not null references public.candidates (user_id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (candidate_id, company_id)
);

alter table public.candidate_blocked_companies enable row level security;
revoke all on public.candidate_blocked_companies from anon, authenticated;
grant select, insert, delete on public.candidate_blocked_companies to authenticated;

create policy "bloqueos: los ve su dueño" on public.candidate_blocked_companies
  for select to authenticated using (candidate_id = (select auth.uid()));
create policy "bloqueos: los crea su dueño" on public.candidate_blocked_companies
  for insert to authenticated
  with check (candidate_id = (select auth.uid()) and (select public.auth_role()) = 'candidate');
create policy "bloqueos: los borra su dueño" on public.candidate_blocked_companies
  for delete to authenticated using (candidate_id = (select auth.uid()));

-- El bloqueo siempre gana: una empresa bloqueada no ve el perfil, aunque sea público.
create or replace function public.can_view_candidate(p_candidate_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.candidates c
    where c.user_id = p_candidate_id
      and (
        c.user_id = (select auth.uid())
        or public.is_admin()
        or (
          not exists (
            select 1 from public.candidate_blocked_companies b
            where b.candidate_id = c.user_id and b.company_id = public.my_company_id()
          )
          and (
            c.visibility = 'public'
            or (c.visibility = 'companies_only' and public.my_company_id() is not null)
          )
        )
      )
  );
$$;
