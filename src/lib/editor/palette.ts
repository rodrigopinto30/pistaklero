/*
 * Colores del editor: una paleta fija (no un selector libre) para que todo se lea bien.
 * Cada color de letra tiene contraste AA (≥ 4,5:1) sobre las tarjetas, el fondo de la página y el
 * gris suave; los resaltados son fondos claros donde el texto sigue con más de 12:1.
 * Se guardan por nombre (data-color="rojo"), nunca como estilo en línea: el sitio solo acepta estos.
 */
export const TEXT_COLORS = ["red", "orange", "green", "blue", "violet", "pink", "gray"] as const;
export const HIGHLIGHTS = ["yellow", "green", "blue", "pink", "violet"] as const;

export type TextColor = (typeof TEXT_COLORS)[number];
export type Highlight = (typeof HIGHLIGHTS)[number];

export const isTextColor = (value: unknown): value is TextColor => TEXT_COLORS.includes(value as TextColor);
export const isHighlight = (value: unknown): value is Highlight => HIGHLIGHTS.includes(value as Highlight);
