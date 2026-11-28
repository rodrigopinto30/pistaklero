import { z } from "zod";
import { stripImages, withinGifLimit } from "@/lib/gifs/gifs";

/**
 * El texto visible de lo que escribe el editor (Markdown con algunas etiquetas): sin etiquetas, sin
 * imágenes y sin los símbolos de formato. Es lo que cuentan los límites (como el contador del editor).
 */
export function visibleText(markdown: string) {
  return stripImages(markdown)
    .replace(/<[^>]+>/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/(^|\n)\s*([-+*]|\d+\.)\s+/g, "$1")
    .replace(/(^|\n)\s*(#{1,6}|>)\s*/g, "$1")
    .replace(/[*_~`]+/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Para el CV en PDF: sin GIFs ni etiquetas (el color y el subrayado no viajan al PDF). */
export const plainForPdf = (markdown: string) => stripImages(markdown).replace(/<[^>]+>/g, "").trim();

/**
 * Un texto del editor: el límite (`max`) cuenta lo que se lee; con las etiquetas de formato puede
 * ocupar hasta el triple (igual que en la base). Hasta 3 GIFs.
 */
export function richText(max: number, min = 0) {
  return z
    .string()
    .trim()
    .superRefine((value, context) => {
      const length = visibleText(value).length;
      if (min > 0 && length < min) {
        context.addIssue({ code: "too_small", minimum: min, origin: "string", inclusive: true, input: value, message: "too_small" });
      } else if (length > max || value.length > max * 3) {
        context.addIssue({ code: "too_big", maximum: max, origin: "string", inclusive: true, input: value, message: "too_big" });
      } else if (!withinGifLimit(value)) {
        context.addIssue({ code: "custom", input: value, message: "too_many_gifs" });
      }
    });
}
