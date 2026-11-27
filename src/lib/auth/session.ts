import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = { id: string; email: string | null; name: string | null };

/**
 * Usuario de la sesión actual, o null. Verifica la firma del JWT (getClaims), no se fía de la cookie.
 * `cache` evita repetir la verificación dentro del mismo pedido.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  // Depende del pedido: así Next no intenta prerenderizar lo que la use.
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;

  const email = typeof data.claims.email === "string" ? data.claims.email : null;
  // Google y GitHub mandan el nombre en los metadatos del usuario.
  const metadata = (data.claims.user_metadata ?? {}) as Record<string, unknown>;
  const rawName = metadata.full_name ?? metadata.name;
  const name = typeof rawName === "string" && rawName.trim() ? rawName.trim().slice(0, 80) : null;
  return { id: data.claims.sub, email, name };
});

/**
 * ¿La persona ingresó (link mágico u OAuth) hace menos de `minutes` minutos?
 * Se usa para acciones sensibles como borrar la cuenta (OWASP A07: reautenticación).
 */
export async function signedInRecently(minutes = 10) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const methods = (data?.claims?.amr ?? []) as { method?: string; timestamp?: number }[];
  const lastSignIn = Math.max(0, ...methods.map((m) => m.timestamp ?? 0));
  return lastSignIn > 0 && Date.now() / 1000 - lastSignIn < minutes * 60;
}

/** Perfil de la cuenta actual (rol, idioma…), o null si no completó la bienvenida. */
export const getCurrentProfile = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, role, locale, email_notifications, suspended_at")
    .eq("id", user.id)
    .maybeSingle();
  return data;
});

/** Datos personales de la cuenta actual (nombre separado y completo), o null si todavía no los cargó. */
export const getCurrentPerson = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("people")
    .select("first_name, middle_name, last_name, full_name")
    .eq("user_id", user.id)
    .maybeSingle();
  return data;
});
