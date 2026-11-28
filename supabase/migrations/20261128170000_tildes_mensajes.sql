-- Tildes de los mensajes, como en las mensajerías:
--   ✓  enviado: el mensaje se guardó;
--   ✓✓ entregado: la otra persona abrió Pistaklero después (su ícono de mensajes lo trajo);
--   ✓✓ en azul, leído: abrió la conversación.
-- Mientras una solicitud no se acepta, no se muestra si se leyó: quien la ignora no queda expuesto.

-- Cuándo fue la última vez que el ícono de mensajes de esta persona preguntó por mensajes nuevos.
alter table public.profiles add column messages_checked_at timestamptz;

/**
 * Lo que consulta el ícono de mensajes (y el encabezado al cargar una página): cuántos hay sin leer.
 * De paso anota que esta persona tiene Pistaklero abierto: lo que le llegó hasta ahora queda
 * "entregado". Escribe solo si le llegó algo nuevo desde la última vez (o cada 30 s): poco tráfico.
 */
create function public.check_messages()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
begin
  update public.profiles p
  set messages_checked_at = clock_timestamp()
  where p.id = v_me
    and (
      p.messages_checked_at is null
      or p.messages_checked_at < clock_timestamp() - interval '30 seconds'
      or exists (
        select 1 from public.conversation_members me
        join public.messages msg on msg.conversation_id = me.conversation_id
        where me.user_id = v_me and msg.sender_id <> v_me and msg.created_at > p.messages_checked_at
      )
    );
  return public.unread_messages_count();
end;
$$;

/**
 * Hasta dónde llegaron y se leyeron mis mensajes en una conversación (para las tildes): la última
 * vez que la otra persona trajo sus mensajes y la última vez que leyó esta conversación. Leer cuenta
 * como entregar. Sin aceptar la solicitud (o con un bloqueo), no hay "leído".
 */
create function public.conversation_receipts(p_conversation_id uuid)
returns table (delivered_at timestamptz, read_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case when public.users_blocked(me.user_id, other.user_id) then null
         else greatest(pr.messages_checked_at, case when other.state = 'accepted' then other.last_read_at end) end,
    case when other.state = 'accepted' and not public.users_blocked(me.user_id, other.user_id) then other.last_read_at end
  from public.conversation_members me
  join public.conversation_members other on other.conversation_id = me.conversation_id and other.user_id <> me.user_id
  join public.profiles pr on pr.id = other.user_id
  where me.conversation_id = p_conversation_id and me.user_id = (select auth.uid()) and me.state <> 'ignored';
$$;

-- La lista de conversaciones también muestra las tildes del último mensaje (si es mío): suma las
-- dos fechas de la otra persona (cambia lo que devuelve, así que se reemplaza).
drop function public.my_conversations(text);

create function public.my_conversations(p_box text default 'inbox')
returns table (
  id uuid, other_id uuid, other_name text, other_avatar text, other_subtitle text,
  last_body text, last_sender uuid, last_message_at timestamptz, unread integer, waiting boolean,
  other_delivered_at timestamptz, other_read_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select cv.id, other.user_id, contact.full_name, contact.avatar_path, contact.subtitle,
    left(last.body, 140), last.sender_id, cv.last_message_at,
    (select count(*)::int from public.messages msg
      where msg.conversation_id = cv.id and msg.sender_id <> (select auth.uid())
        and msg.created_at > coalesce(me.last_read_at, '-infinity'::timestamptz)),
    other.state <> 'accepted',
    greatest(pr.messages_checked_at, case when other.state = 'accepted' then other.last_read_at end),
    case when other.state = 'accepted' then other.last_read_at end
  from public.conversation_members me
  join public.conversations cv on cv.id = me.conversation_id
  join public.conversation_members other on other.conversation_id = cv.id and other.user_id <> me.user_id
  join public.profiles pr on pr.id = other.user_id
  cross join lateral public.message_contact(other.user_id) contact
  left join lateral (
    select msg.body, msg.sender_id from public.messages msg where msg.conversation_id = cv.id order by msg.created_at desc limit 1
  ) last on true
  where me.user_id = (select auth.uid())
    and not public.users_blocked(me.user_id, other.user_id)
    and ((p_box = 'requests' and me.state = 'request') or (p_box <> 'requests' and me.state = 'accepted'))
  order by cv.last_message_at desc
  limit 100;
$$;

revoke execute on function public.check_messages() from public, anon;
revoke execute on function public.conversation_receipts(uuid) from public, anon;
revoke execute on function public.my_conversations(text) from public, anon;
grant execute on function public.check_messages() to authenticated;
grant execute on function public.conversation_receipts(uuid) to authenticated;
grant execute on function public.my_conversations(text) to authenticated;
