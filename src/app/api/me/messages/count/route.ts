import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Mensajes sin leer más solicitudes nuevas (el ícono del encabezado lo consulta cada tanto). */
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("unread_messages_count");
  if (error) return NextResponse.json({ count: 0 }, { status: 401, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ count: data ?? 0 }, { headers: { "Cache-Control": "no-store" } });
}
