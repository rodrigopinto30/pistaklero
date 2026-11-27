import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Límite de intentos fallidos (ver la migración limite_de_intentos):
 *   - por email: 5 fallos en 15 minutos → 15 minutos sin poder intentar;
 *   - por IP: 100 fallos en 15 minutos → 15 minutos (frena a quien prueba muchos emails; alto para no
 *     castigar a una oficina o una red móvil donde mucha gente comparte la IP).
 * Bloqueo suave: la persona puede recuperar la contraseña o entrar con Google/GitHub mientras tanto.
 */
const EMAIL_LIMIT = { max: 5, window: "15 minutes", lock: "15 minutes" } as const;
const IP_LIMIT = { max: 100, window: "15 minutes", lock: "15 minutes" } as const;

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

/** IP de quien hace el pedido. En Vercel, x-forwarded-for la pone el borde (no la manda el cliente). */
async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || null;
}

async function keysFor(email: string) {
  const ip = await clientIp();
  return {
    email: `email:${hash(email.trim().toLowerCase())}`,
    // Sin IP conocida no se cuenta por IP: si no, todas las personas compartirían el mismo contador.
    ip: ip ? `ip:${hash(ip)}` : null,
  };
}

/** Minutos que faltan para poder intentar de nuevo (0 si puede intentar ya). */
export async function minutesToWait(email: string) {
  const keys = await keysFor(email);
  const { data, error } = await createAdminClient().rpc("auth_throttle_wait", {
    p_keys: [keys.email, keys.ip].filter((key): key is string => key !== null),
  });
  if (error) {
    console.error("auth_throttle_wait falló", { code: error.code });
    return 0;
  }
  return Math.ceil((data ?? 0) / 60);
}

export async function registerFailure(email: string) {
  const keys = await keysFor(email);
  const admin = createAdminClient();
  const calls = [{ key: keys.email, ...EMAIL_LIMIT }, ...(keys.ip ? [{ key: keys.ip, ...IP_LIMIT }] : [])];
  await Promise.all(
    calls.map(({ key, max, window, lock }) => admin.rpc("auth_throttle_fail", { p_key: key, p_max: max, p_window: window, p_lock: lock }))
  );
}

/** Después de un ingreso correcto, ese email arranca de cero. */
export async function clearFailures(email: string) {
  const keys = await keysFor(email);
  await createAdminClient().rpc("auth_throttle_reset", { p_key: keys.email });
}
