-- Mensajes: qué hace Enter al escribir (enviar o pasar al siguiente renglón). Se guarda en la cuenta,
-- así es igual en todos los dispositivos. Por defecto, Enter envía (como en WhatsApp Web y LinkedIn).
alter table public.profiles add column message_enter_sends boolean not null default true;

-- Cada uno la cambia en su propio perfil (la política "cada uno edita sus preferencias" ya lo limita).
grant update (message_enter_sends) on public.profiles to authenticated;
