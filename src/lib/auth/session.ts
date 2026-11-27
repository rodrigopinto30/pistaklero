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
