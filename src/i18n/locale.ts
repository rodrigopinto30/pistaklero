import { hasLocale } from "next-intl";
import { type AppLocale, routing } from "./routing";

/**
 * Valida un idioma que viene del cliente (formularios, query strings).
 * Las Server Actions y los Route Handlers no tienen acceso a next/root-params,
 * así que reciben el idioma de forma explícita y lo validan con esto.
 */
export function parseLocale(value: unknown): AppLocale {
  return typeof value === "string" && hasLocale(routing.locales, value)
    ? value
    : routing.defaultLocale;
}

/** Idioma de una ruta como "/en/jobs" → "en". */
export function localeFromPath(path: string): AppLocale {
  return parseLocale(path.split("/")[1]);
}
