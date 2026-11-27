import { z } from "zod";

export const POST_REPORT_REASONS = ["spam", "offensive", "scam", "other"] as const;

/** Una publicación: título corto y un cuerpo en Markdown (se muestra con el mismo renderizador seguro). */
export const postSchema = z.object({
  title: z.string().trim().min(5).max(120),
  body: z.string().trim().min(20).max(5000),
  language: z.enum(["es", "en"]),
});

export type PostField = keyof z.infer<typeof postSchema>;
