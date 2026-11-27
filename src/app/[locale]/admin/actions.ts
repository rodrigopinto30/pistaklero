"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** Todas las funciones del admin vuelven a verificar el rol en la base; esto evita el viaje si no lo es. */
async function requireAdmin() {
  const profile = await getCurrentProfile();
  return profile?.role === "admin" && !profile.suspended_at ? createClient() : null;
}

export async function reviewReport(formData: FormData) {
  const supabase = await requireAdmin();
  const reportId = z.uuid().safeParse(formData.get("reportId"));
  const action = z.enum(["dismiss", "hide_job"]).safeParse(formData.get("reviewAction"));
  if (!supabase || !reportId.success || !action.success) return;
  await supabase.rpc("admin_review_report", { p_report_id: reportId.data, p_action: action.data });
  refresh();
}

export async function setCompanyStatus(formData: FormData) {
  const supabase = await requireAdmin();
  const companyId = z.uuid().safeParse(formData.get("companyId"));
  const status = z.enum(["active", "suspended"]).safeParse(formData.get("status"));
  if (!supabase || !companyId.success || !status.success) return;
  await supabase.rpc("admin_set_company_status", { p_company_id: companyId.data, p_status: status.data });
  refresh();
}

export async function setUserSuspended(formData: FormData) {
  const supabase = await requireAdmin();
  const userId = z.uuid().safeParse(formData.get("userId"));
  const suspended = formData.get("suspended") === "true";
  if (!supabase || !userId.success) return;
  await supabase.rpc("admin_set_user_suspended", { p_user_id: userId.data, p_suspended: suspended });
  refresh();
}
