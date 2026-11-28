-- Editor visual: los textos siguen guardándose en Markdown, con unas pocas etiquetas HTML seguras para
-- lo que Markdown no tiene (subrayado <u>, color <span data-color>, resaltado <mark data-highlight>).
-- El sitio las limpia al mostrarlas (solo esas etiquetas y esos valores).
--
-- 1. Los topes de la base cuentan también esas etiquetas: se triplican. El límite de lo que se
--    escribe (el texto visible) lo sigue controlando la aplicación.
alter table public.candidates drop constraint candidates_bio_check;
alter table public.candidates add constraint candidates_bio_check check (char_length(bio) <= 1500);
alter table public.companies drop constraint companies_description_check;
alter table public.companies add constraint companies_description_check check (char_length(description) <= 6000);
alter table public.candidate_experiences drop constraint candidate_experiences_description_check;
alter table public.candidate_experiences add constraint candidate_experiences_description_check check (char_length(description) <= 3000);
alter table public.candidate_projects drop constraint candidate_projects_description_check;
alter table public.candidate_projects add constraint candidate_projects_description_check check (char_length(description) <= 1500);
alter table public.jobs drop constraint jobs_description_check;
alter table public.jobs add constraint jobs_description_check check (char_length(description) <= 16000);
alter table public.posts drop constraint posts_body_check;
alter table public.posts add constraint posts_body_check check (char_length(body) between 20 and 15000);

-- 2. La búsqueda de ofertas no indexa las etiquetas (solo el texto).
create or replace function public.refresh_job_search_vector(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_config regconfig;
begin
  select case j.language when 'en' then 'pg_catalog.english'::regconfig else 'pg_catalog.spanish'::regconfig end
  into v_config from public.jobs j where j.id = p_job_id;

  update public.jobs j
  set search_vector =
    setweight(to_tsvector(v_config, extensions.unaccent(j.title)), 'A')
    || setweight(to_tsvector(v_config, extensions.unaccent(coalesce(c.name, ''))), 'B')
    || setweight(to_tsvector(v_config, extensions.unaccent(coalesce((
         select string_agg(s.name_es || ' ' || s.name_en, ' ')
         from public.job_skills js join public.skills s on s.id = js.skill_id
         where js.job_id = j.id), ''))), 'B')
    || setweight(to_tsvector(v_config, extensions.unaccent(regexp_replace(j.description, '<[^>]+>', ' ', 'g') || ' ' || j.summary)), 'C')
  from public.companies c
  where j.id = p_job_id and c.id = j.company_id;
end;
$$;

-- 3. El resumen de las tarjetas de publicaciones, sin etiquetas.
alter table public.posts drop column excerpt;
alter table public.posts add column excerpt text generated always as (
  left(trim(regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(body, '<[^>]+>', '', 'g'),                    -- etiquetas (subrayado, colores)
            '!\[[^\]]*\]\([^)]*\)', '', 'g'),                         -- imágenes (GIFs)
          '\[([^\]]*)\]\([^)]*\)', '\1', 'g'),                       -- [texto](url) → texto
        '(^|\n)\s*([-+*]|\d+\.)\s+', '\1', 'g'),                      -- viñetas de listas
      '[#*_>`~|]+', '', 'g'),                                         -- títulos y énfasis
    '\s+', ' ', 'g')), 280)
) stored;
