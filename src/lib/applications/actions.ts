"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { flash } from "@/lib/flash.server";
import { createClient } from "@/lib/supabase/server";

/** "Sí, me postulé" en otro sitio: queda en Mis postulaciones. */
export async function recordExternalApplication(jobId: string): Promise<{ ok: boolean }> {
  const id = z.uuid().safeParse(jobId);
  if (!id.success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_external_application", { p_job_id: id.data });
  return { ok: !error };
}

/** Quitar de la lista una postulación hecha en otro sitio (no la retira de ese sitio). */
export async function removeExternalApplication(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("jobId"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("external_applications").delete().eq("job_id", id.data);
  await flash("removed");
  refresh();
}
