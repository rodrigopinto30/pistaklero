"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { redirect } from "next/navigation";
import { getPathname } from "@/i18n/navigation";
import { parseLocale } from "@/i18n/locale";
import { safeNextPath } from "@/lib/auth/redirect";
import { isPendingKind, PENDING_COOKIE } from "./kinds";

/**
 * Sin sesión, tocar "me gusta" o "guardar" llega acá: se anota la acción en una cookie y se va a
 * ingresar. Al volver (con contraseña, Google/GitHub o recién creada la cuenta) la acción se completa
 * sola y la persona vuelve a la misma página.
 *
 * Seguridad: la cookie solo se crea con este POST (Next verifica el origen de las Server Actions), es
 * HttpOnly y dura una hora; un link de otro sitio no puede dejar acciones pendientes a nombre de nadie.
 */
export async function rememberAndSignIn(formData: FormData) {
  const locale = parseLocale(formData.get("locale"));
  const kind = formData.get("kind");
  const id = z.uuid().safeParse(formData.get("id"));
  const returnTo = safeNextPath(formData.get("returnTo"), `/${locale}`);

  if (isPendingKind(kind) && id.success) {
    (await cookies()).set(PENDING_COOKIE, JSON.stringify({ kind, id: id.data, returnTo }), {
      path: "/",
      maxAge: 60 * 60,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  redirect(`${getPathname({ locale, href: "/sign-in" })}?${new URLSearchParams({ next: returnTo })}`);
}
