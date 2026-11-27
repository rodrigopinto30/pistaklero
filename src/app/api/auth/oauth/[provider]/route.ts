import type { NextRequest } from "next/server";
import { getPublicEnv } from "@/lib/env";
import { isEnabledOAuthProvider } from "@/lib/auth/providers";
import { safeNextPath } from "@/lib/auth/redirect";
import { redirectTo, redirectToSignInWithError } from "@/lib/auth/redirects.server";
import { createClient } from "@/lib/supabase/server";

/*
 * Inicia el login con Google o GitHub. Es un GET (un enlace, no un formulario) para que funcione
 * sin JavaScript y sin chocar con `form-action 'self'` de la CSP al redirigir al proveedor.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/auth/oauth/[provider]">) {
  const { provider } = await params;
  const next = safeNextPath(request.nextUrl.searchParams.get("next"), "/");

  if (!isEnabledOAuthProvider(provider)) {
    return redirectToSignInWithError(next, "callback");
  }

  const callback = new URL("/api/auth/callback", getPublicEnv().NEXT_PUBLIC_SITE_URL);
  callback.searchParams.set("next", next);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callback.toString(), skipBrowserRedirect: true },
  });

  if (error || !data.url) {
    console.error("signInWithOAuth falló", { provider, code: error?.code });
    return redirectToSignInWithError(next, "callback");
  }

  // URL del proveedor (externa). Las cookies PKCE ya quedaron escritas por el cliente.
  return redirectTo(data.url);
}
