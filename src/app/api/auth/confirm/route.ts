import type { NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/redirect";
import { redirectTo, redirectToSignInWithError } from "@/lib/auth/redirects.server";
import { createClient } from "@/lib/supabase/server";

// Link mágico del email: verifica el token (de un solo uso) y abre la sesión.
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"), "/");

  if (!tokenHash) return redirectToSignInWithError(next, "link_expired");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: "email", token_hash: tokenHash });
  if (error) return redirectToSignInWithError(next, "link_expired");

  return redirectTo(next);
}
