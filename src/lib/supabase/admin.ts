import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";
import { getServerEnv } from "@/lib/env.server";
import type { Database } from "./database.types";

/**
 * Cliente con la clave secreta: **ignora RLS**.
 * Usarlo solo en el servidor, para tareas del sistema (envío de emails, cron, admin),
 * y siempre después de verificar a mano quién hace el pedido.
 */
export function createAdminClient() {
  return createClient<Database>(
    getPublicEnv().NEXT_PUBLIC_SUPABASE_URL,
    getServerEnv().SUPABASE_SECRET_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}
