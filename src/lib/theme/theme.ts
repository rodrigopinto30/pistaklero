/** Tema visual. Oscuro por defecto; el claro se elige con el botón del encabezado y se guarda en una cookie. */
export const THEMES = ["dark", "light"] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_COOKIE = "theme";

export function parseTheme(value: unknown): Theme {
  return value === "light" ? "light" : "dark";
}
