/*
 * GIFs de GIPHY dentro de los textos (publicaciones, ofertas, "Quiénes somos", "Sobre mí"…):
 * se insertan como imagen de Markdown y solo se muestran si vienen de GIPHY. Hasta 3 por texto.
 */
export const MAX_GIFS = 3;

/** Solo estas direcciones se muestran como imagen (el resto de las imágenes se ignora). */
export function isGiphyUrl(value: string | undefined | null) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /^(media\d*|i)\.giphy\.com$/.test(url.hostname);
  } catch {
    return false;
  }
}

const IMAGE = /!\[[^\]]*\]\(([^)\s]+)[^)]*\)/g;

/** Cuántos GIFs de GIPHY tiene un texto en Markdown. */
export function countGifs(text: string) {
  return [...text.matchAll(IMAGE)].filter((match) => isGiphyUrl(match[1])).length;
}

/** El Markdown de un GIF: el título va como texto alternativo. */
export function gifMarkdown(gif: { title: string; url: string }) {
  const alt = (gif.title || "GIF").replace(/[[\]]/g, "").slice(0, 120);
  return `![GIF: ${alt}](${gif.url})`;
}

export type Gif = { id: string; title: string; url: string; preview: string; width: number; height: number };

/** Regla de validación: como mucho MAX_GIFS GIFs en el texto (error "too_many_gifs"). */
export const withinGifLimit = (value: string) => countGifs(value) <= MAX_GIFS;

/** El texto sin imágenes de Markdown (para el CV en PDF, donde un GIF no tiene sentido). */
export const stripImages = (text: string) => text.replace(/!\[[^\]]*\]\([^)]*\)\s*/g, "").trim();
