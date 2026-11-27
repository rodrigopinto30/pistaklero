import { z } from "zod";

/*
 * Variables de entorno públicas (llegan al navegador). Se validan la primera vez que se usan,
 * así un valor faltante falla con un mensaje claro en lugar de un error confuso más adelante.
 *
 * Next solo reemplaza las NEXT_PUBLIC_* cuando se leen de forma literal, por eso se listan una por una.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.url(),
});

let cached: z.infer<typeof publicSchema> | undefined;

export function getPublicEnv() {
  cached ??= publicSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });
  return cached;
}
