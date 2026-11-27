"use server";

import { refresh } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/session";
import { dbErrorCode, errorState, type FormState, formValues, successState, zodFieldErrors } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { personNameSchema } from "@/lib/validation/person";

/** Nombre, segundo nombre y apellido de la cuenta actual (cualquier rol). */
export async function savePersonalData(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const profile = await getCurrentProfile();
  if (!profile || profile.suspended_at) return errorState(values, {}, "unknown");

  const parsed = personNameSchema.safeParse(values);
  if (!parsed.success) return errorState(values, zodFieldErrors(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_my_name", {
    p_first_name: parsed.data.firstName,
    p_middle_name: parsed.data.middleName,
    p_last_name: parsed.data.lastName,
  });
  if (error) return errorState(values, {}, dbErrorCode(error));

  refresh();
  return successState();
}
