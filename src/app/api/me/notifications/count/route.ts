import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** Cuántas notificaciones sin leer hay (la campana lo consulta cada tanto). */
export async function GET() {
  if (!(await getCurrentUser())) return NextResponse.json({ count: 0 }, { headers: { "Cache-Control": "no-store" } });
  const supabase = await createClient();
  const { data } = await supabase.rpc("unread_notifications_count");
  return NextResponse.json({ count: data ?? 0 }, { headers: { "Cache-Control": "no-store" } });
}
