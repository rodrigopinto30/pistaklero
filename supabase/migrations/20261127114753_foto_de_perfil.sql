-- Foto de perfil para cualquier cuenta. La sube el servidor ya recodificada (WebP 256×256)
-- y después la asigna con set_my_avatar. Reemplaza al avatar_url externo que venía de Google o GitHub.

alter table public.people
  add column avatar_path text check (avatar_path ~ '^[0-9a-f-]{36}/[0-9a-f]{32}\.webp$');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 262144, array['image/webp']);
-- Sin políticas de escritura sobre storage.objects: ningún cliente puede subir, solo el servidor.

create function public.set_my_avatar(p_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  -- Texto vacío = quitar la foto.
  v_path text := nullif(trim(p_path), '');
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.profiles where id = v_uid and suspended_at is not null) then
    raise exception 'suspended' using errcode = 'P0001';
  end if;
  -- Solo rutas dentro de la carpeta propia: "<user_id>/<32 hex>.webp".
  if v_path is not null and v_path !~ ('^' || v_uid::text || '/[0-9a-f]{32}\.webp$') then
    raise exception 'invalid_path' using errcode = 'P0001';
  end if;
  update public.people set avatar_path = v_path where user_id = v_uid;
  if not found then
    raise exception 'no_person' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function public.set_my_avatar(text) from public, anon;
grant execute on function public.set_my_avatar(text) to authenticated;

-- La foto externa ya no se usa: la app la descarga y la guarda como las demás al terminar la bienvenida.
alter table public.candidates drop column avatar_url;

create or replace function public.onboard_candidate(
  p_first_name text,
  p_middle_name text,
  p_last_name text,
  p_headline text,
  p_locale public.app_locale
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'already_onboarded' using errcode = 'P0001';
  end if;

  perform public.save_my_name(p_first_name, p_middle_name, p_last_name);

  insert into public.profiles (id, role, locale) values (v_uid, 'candidate', p_locale);
  insert into public.candidates (user_id, slug, headline)
  values (
    v_uid,
    public.random_slug(trim(p_first_name) || ' ' || trim(p_last_name)),
    trim(coalesce(p_headline, ''))
  );
end;
$$;
