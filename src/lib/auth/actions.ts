"use server";

import { redirect } from "@/i18n/navigation";
import { parseLocale } from "@/i18n/locale";
import { createClient } from "@/lib/supabase/server";

// Cierra la sesión en todos los dispositivos (revoca los tokens en el servidor).
export async function signOut(formData: FormData) {
  const locale = parseLocale(formData.get("locale"));
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect({ href: "/", locale });
}
