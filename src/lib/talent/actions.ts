"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type SaveCandidateResult = { status: "saved" | "unsaved" } | { status: "error" };

/** La empresa guarda (o deja de guardar) el perfil de una persona. La lista es de todo el equipo. */
export async function toggleSavedCandidate(candidateId: string): Promise<SaveCandidateResult> {
  const id = z.uuid().safeParse(candidateId);
  if (!id.success) return { status: "error" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("toggle_saved_candidate", { p_candidate_id: id.data });
  if (error) {
    if (error.message !== "not_found" && error.message !== "not_authorized") console.error("No se pudo guardar el perfil", { code: error.code });
    return { status: "error" };
  }
  refresh();
  return { status: data ? "saved" : "unsaved" };
}
