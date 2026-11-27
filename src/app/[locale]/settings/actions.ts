"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentProfile, signedInRecently } from "@/lib/auth/session";
import { errorState, type FormState, successState } from "@/lib/forms";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { parseLocale } from "@/i18n/locale";

const preferencesSchema = z.object({
  emailLocale: z.enum(["es", "en"]),
  emailNotifications: z.boolean(),
});

export async function updateAccountPreferences(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await getCurrentProfile();
  const parsed = preferencesSchema.safeParse({
    emailLocale: formData.get("emailLocale"),
    emailNotifications: formData.get("emailNotifications") === "on",
  });
  if (!profile || !parsed.success) return errorState({}, {}, "unknown");

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ locale: parsed.data.emailLocale, email_notifications: parsed.data.emailNotifications })
    .eq("id", profile.id);
  if (error) return errorState({}, {}, "unknown");
  refresh();
  return successState();
}

export type DeleteState = { status: "idle" } | { status: "error"; code: "reauth" | "confirm" | "unknown" };

/**
 * Borra la cuenta y, en cascada, todos sus datos. Exige haber ingresado hace menos de 10 minutos:
 * una sesión robada o una compu prestada no alcanzan para borrar la cuenta de alguien.
 */
export async function deleteAccount(_prev: DeleteState, formData: FormData): Promise<DeleteState> {
  const locale = parseLocale(formData.get("locale"));
  const profile = await getCurrentProfile();
  if (!profile) return { status: "error", code: "unknown" };
  if (formData.get("confirm") !== "on") return { status: "error", code: "confirm" };
  if (!(await signedInRecently(10))) return { status: "error", code: "reauth" };

  const admin = createAdminClient();
  await admin.from("audit_log").insert({ actor_id: profile.id, action: "account.deleted", target_type: "user", target_id: profile.id });
  const { error } = await admin.auth.admin.deleteUser(profile.id);
  if (error) {
    console.error("No se pudo borrar la cuenta", { message: error.message });
    return { status: "error", code: "unknown" };
  }

  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  refresh();
  return redirect({ href: "/", locale });
}
