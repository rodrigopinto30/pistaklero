"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ToggleResult } from "@/lib/posts/actions";
import { createClient } from "@/lib/supabase/server";

async function toggle(rpc: "toggle_company_like" | "toggle_saved_company", companyId: string): Promise<ToggleResult> {
  const id = z.uuid().safeParse(companyId);
  if (!id.success) return { status: "error", code: "unknown" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(rpc, { p_company_id: id.data });
  if (error) {
    const code = (["not_authorized", "not_found", "limit_reached"] as const).find((c) => c === error.message) ?? "unknown";
    return { status: "error", code };
  }
  refresh();
  return { status: data ? "on" : "off" };
}

export async function toggleCompanyLike(companyId: string) {
  return toggle("toggle_company_like", companyId);
}

export async function toggleSavedCompany(companyId: string) {
  return toggle("toggle_saved_company", companyId);
}
