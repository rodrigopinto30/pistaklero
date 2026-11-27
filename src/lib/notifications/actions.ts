"use server";

import { createClient } from "@/lib/supabase/server";

/** Al abrir la sección de notificaciones, todas quedan leídas (como en LinkedIn). */
export async function markAllNotificationsRead() {
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
}
