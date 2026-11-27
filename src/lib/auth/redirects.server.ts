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
 * Lo usan los Route Handlers (OAuth, links) y las Server Actions (contraseña, código).
 */
export async function destinationAfterSignIn(supabase: Awaited<ReturnType<typeof createClient>>, next: string) {
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return next;

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
  // Aceptar una invitación también crea el perfil: no hace falta pasar por la bienvenida.
  if (profile || next.startsWith("/api/team/accept?")) return next;

  const welcome = getPathname({ locale: localeFromPath(next), href: "/welcome" });
  // Desde el registro, `next` ya es la bienvenida con el rol elegido (?role=…): se conserva.
  if (new URL(next, "http://placeholder.invalid").pathname === welcome) return next;
  return welcome;
}

export async function afterSignIn(supabase: Awaited<ReturnType<typeof createClient>>, next: string) {
  return redirectTo(await destinationAfterSignIn(supabase, next));
}

/** Vuelve a la página de ingreso, en el idioma de `next`, mostrando el error. */
export function redirectToSignInWithError(next: string, error: "callback" | "link_expired") {
  const locale = localeFromPath(next);
  const signIn = getPathname({ locale, href: "/sign-in" });
  return redirectTo(`${signIn}?${new URLSearchParams({ error, next })}`);
}
