"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { errorState, type FormState, formValues, successState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  jobId: z.uuid(),
  reason: z.enum(["scam", "fake", "discrimination", "other"]),
  details: z.string().trim().max(500),
});

export async function reportJob(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const user = await getCurrentUser();
  if (!user) return errorState(values, {}, "unknown");

  const parsed = schema.safeParse({ ...values, details: values.details ?? "" });
  if (!parsed.success) return errorState(values, { reason: { code: "required" } });

  const supabase = await createClient();
  const { error } = await supabase.from("job_reports").insert({
    job_id: parsed.data.jobId,
    reporter_id: user.id,
    reason: parsed.data.reason,
    details: parsed.data.details,
  });
  if (error) return errorState(values, {}, error.code === "23505" ? "duplicate" : "unknown");
  return successState();
}
