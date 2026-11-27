"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { parseTheme, THEME_COOKIE } from "./theme";

/** Cambia el tema. Es un formulario común: funciona también sin JavaScript. */
export async function setTheme(formData: FormData) {
  (await cookies()).set(THEME_COOKIE, parseTheme(formData.get("theme")), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  refresh();
}
