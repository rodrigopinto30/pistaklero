"use server";

import { z } from "zod";
import { errorState, type FormState, formValues, successState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

const KNOWN_ERRORS = [
  "not_candidate",
  "job_not_available",
  "company_blocked",
  "profile_incomplete",
  "already_applied",
  "rate_limited",
  "answer_required",
  "invalid_answer",
] as const;
export type ApplyError = (typeof KNOWN_ERRORS)[number];
export type ApplyState = FormState | { status: "apply_error"; code: ApplyError | "unknown" };

/** Postulación en 1 clic: la base valida todo (perfil, oferta, límite diario y respuestas). */
export async function applyToJob(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const values = formValues(formData);
  const jobId = z.uuid().safeParse(values.jobId);
  if (!jobId.success) return errorState(values, {}, "unknown");

  // Respuestas: answer_text_<id> (texto) y answer_option_<id> (índice de la opción).
  const answers: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(values)) {
    const text = key.match(/^answer_text_([0-9a-f-]{36})$/);
    const option = key.match(/^answer_option_([0-9a-f-]{36})$/);
    if (text?.[1]) answers[text[1]] = value.slice(0, 280);
    if (option?.[1] && /^\d$/.test(value)) answers[option[1]] = Number(value);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("apply_to_job", { p_job_id: jobId.data, p_answers: answers });
  if (error) {
    const code = KNOWN_ERRORS.find((known) => known === error.message) ?? "unknown";
    if (code === "unknown") console.error("La postulación falló", { code: error.code, message: error.message });
    return { status: "apply_error", code };
  }

  // Sin refresh(): el panel se volvería a renderizar como "Ya te postulaste" y se perdería
  // el mensaje de confirmación que anuncia el lector de pantalla.
  return successState();
}
