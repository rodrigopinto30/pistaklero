"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type SaveJobResult = { status: "saved" | "unsaved" } | { status: "error"; code: "not_candidate" | "job_not_available" | "limit_reached" | "unknown" };

/** Guarda o saca de guardados un empleo. La base verifica el rol, que la oferta sea pública y el límite. */
export async function toggleSavedJob(jobId: string): Promise<SaveJobResult> {
  const id = z.uuid().safeParse(jobId);
  if (!id.success) return { status: "error", code: "unknown" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("toggle_saved_job", { p_job_id: id.data });
  if (error) {
    const code = (["not_candidate", "job_not_available", "limit_reached"] as const).find((c) => c === error.message) ?? "unknown";
    if (code === "unknown") console.error("No se pudo guardar el empleo", { code: error.code, message: error.message });
    return { status: "error", code };
  }
  refresh();
  return { status: data ? "saved" : "unsaved" };
}
