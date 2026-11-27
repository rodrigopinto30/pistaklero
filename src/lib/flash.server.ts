import "server-only";
import { cookies } from "next/headers";
import { FLASH_COOKIE, type FlashKey } from "./flash";

/** Deja un aviso para mostrar en la próxima respuesta. No es HttpOnly: el cliente la lee y la borra. */
export async function flash(key: FlashKey) {
  (await cookies()).set(FLASH_COOKIE, `${key}.${Date.now().toString(36)}`, {
    path: "/",
    maxAge: 60,
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });
}
