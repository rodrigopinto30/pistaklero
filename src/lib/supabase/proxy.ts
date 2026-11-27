import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "./database.types";

type PendingCookie = { name: string; value: string; options: Parameters<NextResponse["cookies"]["set"]>[2] };

/**
 * Renueva la sesión de Supabase antes de renderizar.
 *
 * Actualiza las cookies del pedido (para que la página vea la sesión nueva) y devuelve una función
 * que copia las cookies y las cabeceras anti-caché a la respuesta. Así el token de renovación,
 * que es de un solo uso, se consume una sola vez por navegación.
 */
export async function refreshSession(request: NextRequest) {
  const env = getPublicEnv();
  const pendingCookies: PendingCookie[] = [];
  const pendingHeaders: Record<string, string> = {};

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value, options } of cookiesToSet) {
            request.cookies.set(name, value);
            pendingCookies.push({ name, value, options });
          }
          Object.assign(pendingHeaders, headers);
        },
      },
    }
  );

  // Valida el JWT y, si venció, lo renueva. No usar getSession() acá: no verifica la firma.
  await supabase.auth.getClaims();

  return function applyTo(response: NextResponse) {
    for (const { name, value, options } of pendingCookies) {
      response.cookies.set(name, value, options);
    }
    for (const [key, value] of Object.entries(pendingHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  };
}
