import "server-only";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/**
 * Lo que la tarjeta de un empleo necesita saber de quien mira:
 * - "candidate": puede guardar y postularse (con lo que ya guardó o donde ya se postuló).
 * - "guest": sin sesión; los botones llevan a ingresar.
 * - "none": empresas y admins (no se postulan ni guardan).
 */
export type JobViewer = { mode: "candidate" | "guest" | "none"; saved: Set<string>; applied: Set<string> };

export async function getJobViewer(jobIds: string[]): Promise<JobViewer> {
  const empty = { saved: new Set<string>(), applied: new Set<string>() };
  if (!(await getCurrentUser())) return { mode: "guest", ...empty };
  const profile = await getCurrentProfile();
  if (profile?.role !== "candidate") return { mode: profile ? "none" : "guest", ...empty };
  if (jobIds.length === 0) return { mode: "candidate", ...empty };

  const supabase = await createClient();
  const [saved, applied] = await Promise.all([
    supabase.from("saved_jobs").select("job_id").in("job_id", jobIds),
    supabase.from("applications").select("job_id").eq("candidate_id", profile.id).in("job_id", jobIds),
  ]);
  return {
    mode: "candidate",
    saved: new Set((saved.data ?? []).map((r) => r.job_id)),
    applied: new Set((applied.data ?? []).map((r) => r.job_id)),
  };
}
