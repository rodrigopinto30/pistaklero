/*
 * Países e idiomas que se pueden elegir. Los nombres los da Intl.DisplayNames en el idioma del sitio,
 * así no hay que traducirlos a mano.
 */
export const COUNTRY_CODES = [
  "AR", "BO", "BR", "CA", "CL", "CO", "CR", "CU", "DE", "DO", "EC", "ES", "FR", "GB", "GT", "HN",
  "IE", "IT", "MX", "NI", "NL", "PA", "PE", "PR", "PT", "PY", "SV", "US", "UY", "VE",
] as const;

export const LANGUAGE_CODES = ["es", "en", "pt", "fr", "de", "it", "zh", "ja", "ko", "ru", "ar", "hi", "nl", "ca", "gn", "qu"] as const;

export function countryOptions(locale: string) {
  const names = new Intl.DisplayNames([locale], { type: "region" });
  return COUNTRY_CODES.map((code) => ({ code, name: names.of(code) ?? code })).sort((a, b) =>
    a.name.localeCompare(b.name, locale)
  );
}

export function languageOptions(locale: string) {
  const names = new Intl.DisplayNames([locale], { type: "language" });
  return LANGUAGE_CODES.map((code) => ({ code, name: names.of(code) ?? code }));
}

export function countryName(code: string | null, locale: string) {
  return code ? (new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code) : null;
}

/** "2025-03-01" → "mar 2025" / "Mar 2025". */
export function formatMonth(date: string | null, locale: string) {
  if (!date) return null;
  return new Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(date));
}
