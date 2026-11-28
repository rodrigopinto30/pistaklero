import { richInline, richText } from "@/lib/editor/text";
import { z } from "zod";

export const POST_REPORT_REASONS = ["spam", "offensive", "scam", "other"] as const;

/**
 * Una publicación: un título de una línea con formato (negrita, colores…; 5 a 120 caracteres que se
 * leen) y un cuerpo en Markdown. Los dos se muestran con el mismo renderizador seguro.
 */
export const postSchema = z.object({
  title: richInline(120, 5),
  body: richText(5000, 20),
  language: z.enum(["es", "en"]),
});

export type PostField = keyof z.infer<typeof postSchema>;
