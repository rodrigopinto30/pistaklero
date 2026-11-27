import "server-only";
import { NextResponse } from "next/server";
import type { createClient } from "@/lib/supabase/server";
import { getPublicEnv } from "@/lib/env";
import { getPathname } from "@/i18n/navigation";
import { localeFromPath } from "@/i18n/locale";

/** Redirección absoluta dentro del sitio (los Route Handlers necesitan URLs completas). */
export function redirectTo(path: string) {
  return NextResponse.redirect(new URL(path, getPublicEnv().NEXT_PUBLIC_SITE_URL), 303);
}

/**
 * Adónde ir después de ingresar: a `next`, o a la bienvenida si la cuenta todavía no eligió su rol.
 */
export async function afterSignIn(supabase: Awaited<ReturnType<typeof createClient>>, next: string) {
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return redirectTo(next);

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (profile) return redirectTo(next);

  const welcome = getPathname({ locale: localeFromPath(next), href: "/welcome" });
  return redirectTo(welcome);
}

/** Vuelve a la página de ingreso, en el idioma de `next`, mostrando el error. */
export function redirectToSignInWithError(next: string, error: "callback" | "link_expired") {
  const locale = localeFromPath(next);
  const signIn = getPathname({ locale, href: "/sign-in" });
  return redirectTo(`${signIn}?${new URLSearchParams({ error, next })}`);
}
