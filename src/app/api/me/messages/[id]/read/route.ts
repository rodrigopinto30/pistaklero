import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/security/same-origin";
import { createClient } from "@/lib/supabase/server";

/**
 * Marca una conversación como leída (la vista abierta la llama sola, al abrirla y al llegar
 * mensajes). Es una ruta y no una Server Action: una llamada en segundo plano que sale justo
 * después de cerrar la conversación iba a la URL de la página nueva, que no conoce esa acción.
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/api/me/messages/[id]/read">) {
  const { id } = await params;
  if (!isSameOrigin(request)) return new NextResponse(null, { status: 403 });
  if (!z.uuid().safeParse(id).success) return new NextResponse(null, { status: 400 });
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_conversation_read", { p_conversation_id: id });
  return new NextResponse(null, { status: error ? 400 : 204 });
}
