import "server-only";
import { NextResponse } from "next/server";
import { getPublicEnv } from "@/lib/env";
import { getPathname } from "@/i18n/navigation";
import { localeFromPath } from "@/i18n/locale";

/** Redirección absoluta dentro del sitio (los Route Handlers necesitan URLs completas). */
export function redirectTo(path: string) {
  return NextResponse.redirect(new URL(path, getPublicEnv().NEXT_PUBLIC_SITE_URL), 303);
}

/** Vuelve a la página de ingreso, en el idioma de `next`, mostrando el error. */
export function redirectToSignInWithError(next: string, error: "callback" | "link_expired") {
  const locale = localeFromPath(next);
  const signIn = getPathname({ locale, href: "/sign-in" });
  return redirectTo(`${signIn}?${new URLSearchParams({ error, next })}`);
}
