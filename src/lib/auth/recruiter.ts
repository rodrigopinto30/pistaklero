import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "./session";

/** Reclutador actual con su empresa y su rol dentro de ella, o null. */
export const getCurrentRecruiter = cache(async () => {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "recruiter" || profile.suspended_at) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("company_members")
    .select("member_role, companies(*)")
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!data?.companies) return null;

  return { userId: profile.id, memberRole: data.member_role, company: data.companies };
});
