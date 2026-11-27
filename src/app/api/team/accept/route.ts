import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { redirectTo } from "@/lib/auth/redirects.server";
import { createClient } from "@/lib/supabase/server";
import { getPathname } from "@/i18n/navigation";
import { parseLocale } from "@/i18n/locale";

const KNOWN_ERRORS = ["invalid_invitation", "email_mismatch", "already_onboarded"] as const;

// Link de la invitación: si no hay sesión, pide ingresar con el email invitado y vuelve acá.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const locale = parseLocale(request.nextUrl.searchParams.get("locale"));
  const errorPage = (code: string) => `${getPathname({ locale, href: "/invitation" })}?${new URLSearchParams({ error: code })}`;

  if (!token) return redirectTo(errorPage("invalid_invitation"));

  if (!(await getCurrentUser())) {
    const back = `/api/team/accept?${new URLSearchParams({ token, locale })}`;
    return redirectTo(`${getPathname({ locale, href: "/sign-in" })}?${new URLSearchParams({ next: back })}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invitation", { p_token: token, p_locale: locale });
  if (error) {
    const code = KNOWN_ERRORS.find((known) => known === error.message) ?? "invalid_invitation";
    return redirectTo(errorPage(code));
  }
  return redirectTo(getPathname({ locale, href: "/dashboard" }));
}
