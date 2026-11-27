"use server";

import { flash } from "@/lib/flash.server";
import { refresh } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function withdrawApplication(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("applicationId"));
  if (!id.success) return;
  const supabase = await createClient();
  // La función verifica que la postulación sea de quien la retira y que no esté cerrada.
  const { error } = await supabase.rpc("withdraw_application", { p_application_id: id.data });
  if (!error) await flash("withdrawn");
  refresh();
}
