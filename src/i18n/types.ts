import type en from "../../messages/en.json";
import type es from "../../messages/es.json";
import type { routing } from "./routing";

// Tipado de next-intl: claves de traducción y locales verificados por TypeScript.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof es;
  }
}

/*
 * Falla el chequeo de tipos si es.json y en.json no tienen exactamente las mismas claves.
 * Así ninguna traducción queda faltando en un idioma.
 */
type SameShape<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
export const messagesInSync: SameShape<typeof es, typeof en> = true;
