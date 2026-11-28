"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { scheduleOutboxFlush } from "@/lib/email/outbox";
import { errorState, type FormState, normalizeNewlines, successState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  applicationId: z.uuid(),
  to: z.enum(["shortlisted", "interview", "hired", "rejected"]),
  message: z.string().trim().max(1000).optional(),
});

/** Cambia el estado de una postulación. La base valida la transición y avisa a la candidata. */
export async function changeApplicationStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  const message = formData.get("message");
  const parsed = schema.safeParse({
    applicationId: formData.get("applicationId"),
    to: formData.get("to"),
    message: typeof message === "string" ? normalizeNewlines(message) : undefined,
  });
  if (!parsed.success) return errorState({}, { message: { code: "too_long", limit: 1000 } });

  const supabase = await createClient();
  const { error } = await supabase.rpc("change_application_status", {
    p_application_id: parsed.data.applicationId,
    p_to: parsed.data.to,
    p_message: parsed.data.to === "rejected" ? (parsed.data.message ?? "") : "",
  });
  if (error) return errorState({}, {}, "unknown");

  // La función encoló el aviso por email: se envía apenas termina la respuesta.
  scheduleOutboxFlush();
  refresh();
  return successState();
}
