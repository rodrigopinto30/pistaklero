import { createClient } from "@supabase/supabase-js";

/*
 * Antes de toda la suite: los tests corren desde una sola IP y varios prueban contraseñas o códigos
 * equivocados a propósito. Sin esto, dos corridas seguidas pasarían el límite de intentos por IP.
 */
export default async function globalSetup() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321", process.env.SUPABASE_SECRET_KEY ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await admin.from("auth_throttle").delete().like("key", "ip:%");
  if (error) throw error;
}
