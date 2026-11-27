-- Los GIFs en las publicaciones son imágenes de Markdown: el resumen de la tarjeta no las muestra
-- como texto ("!GIF: …"). Se rearma la columna generada con un paso más que las quita.
alter table public.posts drop column excerpt;
alter table public.posts add column excerpt text generated always as (
  left(trim(regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(body, '!\[[^\]]*\]\([^)]*\)', '', 'g'),     -- imágenes (GIFs)
          '\[([^\]]*)\]\([^)]*\)', '\1', 'g'),                       -- [texto](url) → texto
        '(^|\n)\s*([-+*]|\d+\.)\s+', '\1', 'g'),                      -- viñetas de listas
      '[#*_>`~|]+', '', 'g'),                                         -- títulos y énfasis
    '\s+', ' ', 'g')), 280)
) stored;
