import "server-only";
import { z } from "zod";

/*
 * Variables de entorno secretas: solo existen en el servidor.
 * `server-only` hace fallar el build si algún componente de cliente importa este módulo.
 */
const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
});

let cached: z.infer<typeof serverSchema> | undefined;

export function getServerEnv() {
  cached ??= serverSchema.parse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  });
  return cached;
}
