import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { type EmailTemplate, type EmailTemplates, isEmailTemplate, renderEmail } from "./templates";
import { deliver } from "./transport";

const MAX_ATTEMPTS = 5;

/** Encola un email. Con dedupeKey, el mismo aviso nunca se manda dos veces. */
export async function enqueueEmail<K extends EmailTemplate>(email: {
  to: string;
  userId?: string | null;
  template: K;
  locale: "es" | "en";
  data: EmailTemplates[K];
  dedupeKey?: string;
}) {
  const { error } = await createAdminClient().rpc("enqueue_email", {
    p_to_email: email.to,
    p_to_user_id: email.userId ?? (null as unknown as string),
    p_template: email.template,
    p_locale: email.locale,
    p_payload: email.data,
    p_dedupe_key: email.dedupeKey ?? (null as unknown as string),
  });
  if (error) throw new Error(`No se pudo encolar el email: ${error.message}`);
  // Se envía apenas termina la respuesta; si falla, el cron lo reintenta.
  after(() => flushOutbox().catch((e) => console.error("Falló el envío de emails", e)));
}

/**
 * Envía los emails pendientes. Si un envío falla, se reintenta con espera creciente
 * (2, 4, 8, 16 minutos) y después de 5 intentos queda como fallido para revisarlo.
 */
export async function flushOutbox(limit = 25) {
  const admin = createAdminClient();
  const { data: batch, error } = await admin.rpc("claim_email_batch", { p_limit: limit });
  if (error) throw new Error(`No se pudo leer la cola de emails: ${error.message}`);

  let sent = 0;
  let failed = 0;
  for (const row of batch ?? []) {
    try {
      if (!isEmailTemplate(row.template)) throw new Error(`Plantilla desconocida: ${row.template}`);
      const email = renderEmail(row.template, row.locale, row.payload as never);
      await deliver({ to: row.to_email, ...email });
      await admin.from("email_outbox").update({ status: "sent", sent_at: new Date().toISOString(), last_error: null }).eq("id", row.id);
      sent++;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      const giveUp = row.attempts >= MAX_ATTEMPTS;
      await admin
        .from("email_outbox")
        .update({
          status: giveUp ? "failed" : "pending",
          last_error: message.slice(0, 500),
          next_attempt_at: new Date(Date.now() + 2 ** row.attempts * 60_000).toISOString(),
        })
        .eq("id", row.id);
      failed++;
      if (giveUp) console.error("Email descartado tras 5 intentos", { id: row.id, template: row.template });
    }
  }
  return { sent, failed };
}
