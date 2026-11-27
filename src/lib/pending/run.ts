import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { safeNextPath } from "@/lib/auth/redirect";
import { flash } from "@/lib/flash.server";
import type { createClient } from "@/lib/supabase/server";
import { isPendingKind, PENDING_COOKIE, type PendingKind } from "./kinds";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const pendingSchema = z.object({ kind: z.string(), id: z.uuid(), returnTo: z.string() });

/**
 * Si quedó una acción pendiente (ver rememberAndSignIn), la completa y la borra.
 * Devuelve adónde volver (la página donde la persona tocó el botón) o null si no había nada.
 * Se llama recién cuando la cuenta ya tiene perfil: guardar un empleo, por ejemplo, pide ser candidata.
 */
export async function runPendingAction(supabase: Supabase): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(PENDING_COOKIE)?.value;
  if (!raw) return null;
  store.delete(PENDING_COOKIE);

  let parsed: z.infer<typeof pendingSchema>;
  try {
    parsed = pendingSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
  if (!isPendingKind(parsed.kind)) return null;

  if (await turnOn(supabase, parsed.kind, parsed.id)) {
    await flash(parsed.kind.startsWith("like") ? "pendingLiked" : "pendingSaved");
  }
  return safeNextPath(parsed.returnTo, "/");
}

/** Deja la acción "prendida": si ya lo estaba (por ejemplo, ya le había dado me gusta), no la apaga. */
async function turnOn(supabase: Supabase, kind: PendingKind, id: string): Promise<boolean> {
  switch (kind) {
    case "save-job": {
      const { data: saved } = await supabase.from("saved_jobs").select("job_id").eq("job_id", id).maybeSingle();
      if (saved) return true;
      return !(await supabase.rpc("toggle_saved_job", { p_job_id: id })).error;
    }
    case "like-company":
    case "save-company": {
      const { data: card } = await supabase.rpc("company_cards", { p_company_id: id }).maybeSingle();
      if (!card) return false;
      if (kind === "like-company" ? card.liked : card.saved) return true;
      const rpc = kind === "like-company" ? "toggle_company_like" : "toggle_saved_company";
      return !(await supabase.rpc(rpc, { p_company_id: id })).error;
    }
    case "like-post":
    case "save-post": {
      const { data: card } = await supabase.rpc("post_cards", { p_post_id: id }).maybeSingle();
      if (!card) return false;
      if (kind === "like-post" ? card.liked : card.saved) return true;
      const rpc = kind === "like-post" ? "toggle_post_like" : "toggle_saved_post";
      return !(await supabase.rpc(rpc, { p_post_id: id })).error;
    }
  }
}
