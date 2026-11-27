"use server";

import { getPublicEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";
import { magicLinkSchema } from "@/lib/validation/auth";
import { parseLocale } from "@/i18n/locale";

export type MagicLinkState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; code: "invalid_email" | "rate_limited" | "unknown"; email: string };

export async function sendMagicLink(
  _previous: MagicLinkState,
  formData: FormData
): Promise<MagicLinkState> {
  const rawEmail = String(formData.get("email") ?? "").trim();
  const locale = parseLocale(formData.get("locale"));
  const next = safeNextPath(formData.get("next"), `/${locale}`);

  const parsed = magicLinkSchema.safeParse({ email: rawEmail });
  if (!parsed.success) {
    return { status: "error", code: "invalid_email", email: rawEmail };
  }

  const redirectTo = new URL("/api/auth/confirm", getPublicEnv().NEXT_PUBLIC_SITE_URL);
  redirectTo.searchParams.set("next", next);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: redirectTo.toString(), shouldCreateUser: true },
  });

  if (error) {
    const code = error.status === 429 ? "rate_limited" : "unknown";
    if (code === "unknown") console.error("signInWithOtp falló", { status: error.status, code: error.code });
    return { status: "error", code, email: parsed.data.email };
  }

  // Siempre la misma respuesta, exista o no la cuenta: no se puede averiguar quién está registrado.
  return { status: "sent", email: parsed.data.email };
}
