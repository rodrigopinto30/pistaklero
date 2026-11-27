import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { type BoardError, fetchBoard, type Provider, PROVIDERS } from "./providers";

export type SyncOutcome =
  | { ok: true; created: number; updated: number; skipped: number; closed: number }
  | { ok: false; code: BoardError | "not_found_source" | "failed" };

/** Sincroniza un tablero: baja las ofertas, las aplica en la base y guarda el resultado o el error. */
export async function syncImportSource(sourceId: string): Promise<SyncOutcome> {
  const admin = createAdminClient();
  const { data: source } = await admin.from("import_sources").select("id, provider, board_token").eq("id", sourceId).maybeSingle();
  if (!source || !(PROVIDERS as readonly string[]).includes(source.provider)) return { ok: false, code: "not_found_source" };

  const board = await fetchBoard(source.provider as Provider, source.board_token);
  if (!board.ok) {
    await admin.rpc("record_import_error", { p_source_id: source.id, p_error: board.code });
    return board;
  }

  const { data, error } = await admin.rpc("sync_import_source", { p_source_id: source.id, p_jobs: board.jobs, p_skipped: board.skipped });
  if (error || !data) {
    console.error("La sincronización falló", { sourceId, message: error?.message });
    await admin.rpc("record_import_error", { p_source_id: source.id, p_error: "failed" });
    return { ok: false, code: "failed" };
  }
  return { ok: true, ...(data as { created: number; updated: number; skipped: number; closed: number }) };
}

/** Todos los tableros activos, de a uno (son APIs de terceros: sin ráfagas). */
export async function syncAllImportSources() {
  const admin = createAdminClient();
  const { data: sources } = await admin.from("import_sources").select("id").eq("active", true).order("last_attempt_at", { ascending: true, nullsFirst: true }).limit(100);
  let ok = 0;
  let failed = 0;
  for (const source of sources ?? []) {
    const outcome = await syncImportSource(source.id);
    if (outcome.ok) ok++;
    else failed++;
  }
  return { sources: ok + failed, ok, failed };
}
