/**
 * Tema visual. El modo oscuro está implementado pero apagado: por ahora el sitio es solo claro.
 * Para volver a ofrecerlo, alcanza con poner DARK_MODE_ENABLED en true (vuelve el botón del encabezado).
 */
export const DARK_MODE_ENABLED = false;

export const THEMES = ["dark", "light"] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_COOKIE = "theme";

export function parseTheme(value: unknown, darkModeEnabled = DARK_MODE_ENABLED): Theme {
  if (!darkModeEnabled) return "light";
  return value === "light" ? "light" : "dark";
}

/** Color de la barra del navegador en móviles, según el tema por defecto. */
export const THEME_COLOR = DARK_MODE_ENABLED ? "#0a0c0b" : "#f6f7f4";
