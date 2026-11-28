import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * Los mensajes nuevos de una conversación (después de `after`), para la vista abierta, y hasta dónde
 * llegaron y se leyeron los míos (las tildes).
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/me/messages/[id]">) {
  const { id } = await params;
  const after = z.iso.datetime({ offset: true }).safeParse(request.nextUrl.searchParams.get("after"));
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ messages: [], receipts: null }, { status: 400 });
  const supabase = await createClient();
  const [{ data }, { data: receipts }] = await Promise.all([
    supabase.rpc("conversation_messages", { p_conversation_id: id, p_after: after.success ? after.data : undefined, p_limit: 100 }),
    supabase.rpc("conversation_receipts", { p_conversation_id: id }),
  ]);
  return NextResponse.json({ messages: data ?? [], receipts: receipts?.[0] ?? null }, { headers: { "Cache-Control": "no-store" } });
}
