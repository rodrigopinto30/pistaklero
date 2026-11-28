import "server-only";
import { getPathname, redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getCurrentRecruiter } from "./recruiter";
import { getCurrentProfile, getCurrentUser } from "./session";

type Href = Parameters<typeof getPathname>[0]["href"];

/**
 * Para páginas del panel: sin sesión → ingreso (y vuelve acá); sin rol → bienvenida;
 * candidata → inicio. Devuelve el reclutador con su empresa.
 */
export async function requireRecruiterPage(locale: AppLocale, href: Href) {
  if (!(await getCurrentUser())) {
    redirect({ href: { pathname: "/sign-in", query: { next: getPathname({ locale, href }) } }, locale });
  }
  const profile = await getCurrentProfile();
  if (!profile) redirect({ href: "/welcome", locale });
  const recruiter = await getCurrentRecruiter();
  if (!recruiter) redirect({ href: "/", locale });
  return recruiter!;
}

/** Páginas de cualquier cuenta con perfil (por ejemplo, Mensajes). Sin sesión, al ingreso y de vuelta. */
export async function requireProfilePage(locale: AppLocale, href: Href) {
  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: { pathname: "/sign-in", query: { next: getPathname({ locale, href }) } }, locale });
  }
  const profile = await getCurrentProfile();
  if (!profile) redirect({ href: "/welcome", locale });
  return { user: user!, profile: profile! };
}
