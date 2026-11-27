import type { NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/redirect";
import { afterSignIn, redirectToSignInWithError } from "@/lib/auth/redirects.server";
import { createClient } from "@/lib/supabase/server";

// Vuelta de Google o GitHub: cambia el código (PKCE) por una sesión.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"), "/");

  if (!code) return redirectToSignInWithError(next, "callback");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("exchangeCodeForSession falló", { code: error.code });
    return redirectToSignInWithError(next, "callback");
  }

  return afterSignIn(supabase, next);
}
