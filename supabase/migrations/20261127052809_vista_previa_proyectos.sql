-- Vistas previas de los proyectos: el servidor baja la imagen Open Graph del enlace (a prueba de SSRF),
-- la recodifica a WebP de 1200×630 y la guarda acá. Lectura pública; escritura solo del servidor.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-previews', 'project-previews', true, 524288, array['image/webp']);
-- Sin políticas de escritura sobre storage.objects: ningún cliente puede subir, solo el servidor.
