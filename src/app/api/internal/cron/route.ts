import { NextResponse } from "next/server";
import { flushOutbox } from "@/lib/email/outbox";
import { isInternalRequest } from "@/lib/security/internal-auth";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Tarea diaria (Vercel Cron la llama con GET y "Authorization: Bearer $CRON_SECRET"):
 * 1. Anti-ghosting: recordatorios de 7 días, avisos de 14, cierres de 30 y badges de respuesta.
 * 2. Envía todo lo encolado (también reintenta lo que haya fallado antes).
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

  let sent = 0;
  let failed = 0;
  for (let batch = 0; batch < 20; batch++) {
    const result = await flushOutbox(50);
    sent += result.sent;
    failed += result.failed;
    if (result.sent + result.failed === 0) break;
  }

  return NextResponse.json({ maintenance, emails: { sent, failed } });
}
