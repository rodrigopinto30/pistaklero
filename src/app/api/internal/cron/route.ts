import { NextResponse } from "next/server";
import { flushOutbox } from "@/lib/email/outbox";
import { isInternalRequest } from "@/lib/security/internal-auth";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Tarea diaria (Vercel Cron la llama con GET y "Authorization: Bearer $CRON_SECRET"):
 * 1. Anti-ghosting: recordatorios de 7 días, avisos de 14, cierres de 30 y badges de respuesta.
 * 2. Avisa a cada candidata cuántos empleos nuevos coinciden con sus habilidades (la campana).
 * 3. Envía todo lo encolado (también reintenta lo que haya fallado antes).
 */
export async function GET(request: Request) {
  if (!isInternalRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: maintenance, error } = await createAdminClient().rpc("daily_maintenance");
  if (error) {
    console.error("La tarea diaria falló", { message: error.message });
    return NextResponse.json({ error: "maintenance_failed" }, { status: 500 });
  }

  // Las claves de "una vista por persona por día" no se guardan más de dos días.
  const { error: purgeError } = await createAdminClient().rpc("purge_job_view_keys");
  if (purgeError) console.error("No se pudieron borrar las claves de vistas", { message: purgeError.message });

  const { data: matches, error: matchesError } = await createAdminClient().rpc("notify_job_matches");
  if (matchesError) console.error("Los avisos de empleos para vos fallaron", { message: matchesError.message });

  let sent = 0;
  let failed = 0;
  for (let batch = 0; batch < 20; batch++) {
    const result = await flushOutbox(50);
    sent += result.sent;
    failed += result.failed;
    if (result.sent + result.failed === 0) break;
  }

  return NextResponse.json({ maintenance, jobMatches: matches ?? 0, emails: { sent, failed } });
}
