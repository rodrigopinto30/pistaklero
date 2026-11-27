import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "./database.types";
import { SESSION_COOKIE_OPTIONS } from "./cookies";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 * Actúa como el usuario de la sesión: todas las consultas pasan por RLS.
 * Hay que crear uno por pedido.
 */
export async function createClient() {
  // Todo lo que consulta a Supabase depende del pedido (sesión, RLS). Además, el cliente usa
  // Date.now() al iniciarse: sin esto, Next intenta prerenderizar y avisa en desarrollo.
  await connection();
  const cookieStore = await cookies();
  const env = getPublicEnv();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: SESSION_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Un Server Component no puede escribir cookies: el proxy ya renovó la sesión.
          }
        },
      },
    }
  );
}
