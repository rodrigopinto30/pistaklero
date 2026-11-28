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

/** Entidades HTML que puede dejar el Markdown (por ejemplo, un "<" escrito a mano). */
const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };

/**
 * Un texto de una línea con formato (como el título de una publicación) sin el formato: sin
 * etiquetas, sin los símbolos de negrita/cursiva/tachado y con los caracteres escapados tal cual
 * ("5\*3" → "5*3"). Es lo que va en el <title> de la página, en los avisos, en el slug y en la
 * búsqueda (la base calcula lo mismo en public.plain_inline).
 */
export function plainInline(markdown: string) {
  return markdown
    .replace(/<[^>]+>/g, "")
    .replace(/(^|[^\\*_~`])[*_~`]+/g, "$1")
    .replace(/\\([\\`*_{}[\]()#+\-.!~<>|])/g, "$1")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Un título que empieza como lista, encabezado o cita ("1. ", "# ", "- ", "> ") es texto: se escapa
 * para que el Markdown no lo lea como bloque (en un título no hay bloques y se perdía).
 */
export function escapeLeadingBlock(markdown: string) {
  return markdown.replace(/^(\s*)(\d+)([.)])/, "$1$2\\$3").replace(/^(\s*)([#>+-])/, "$1\\$2");
}

/**
 * Un texto de una línea con formato (negrita, cursiva, subrayado, tachado, color y resaltado): el
 * límite cuenta lo que se lee y, con las etiquetas, puede ocupar hasta el triple. Sin saltos de línea.
 */
export function richInline(max: number, min = 0) {
  return z
    .string()
    .transform((value) => value.replace(/\s*[\r\n]+\s*/g, " ").trim())
    .superRefine((value, context) => {
      const length = plainInline(value).length;
      if (min > 0 && length < min) {
        context.addIssue({ code: "too_small", minimum: min, origin: "string", inclusive: true, input: value, message: "too_small" });
      } else if (length > max || value.length > max * 3) {
        context.addIssue({ code: "too_big", maximum: max, origin: "string", inclusive: true, input: value, message: "too_big" });
      }
    });
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
