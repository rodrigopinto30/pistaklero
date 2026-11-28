import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { isBot, viewKey } from "@/lib/jobs/views";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Cuenta una vista de una oferta (lo manda la página con navigator.sendBeacon al abrirse).
 * Una por persona por día: ver lib/jobs/views.ts. Solo pedidos del propio sitio y de navegadores.
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/api/jobs/[id]/view">) {
  const { id } = await params;
  const sameSite = request.headers.get("sec-fetch-site");
  if (!z.uuid().safeParse(id).success || (sameSite !== null && sameSite !== "same-origin") || isBot(request.headers.get("user-agent"))) {
    return new NextResponse(null, { status: 204 });
  }

  const user = await getCurrentUser();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || null;
  const key = viewKey({ jobId: id, userId: user?.id ?? null, ip });
  if (key) {
    const { error } = await createAdminClient().rpc("record_job_view", { p_job_id: id, p_key_hash: key, p_viewer: user?.id });
    if (error) console.error("record_job_view falló", { code: error.code });
  }
  return new NextResponse(null, { status: 204 });
}
