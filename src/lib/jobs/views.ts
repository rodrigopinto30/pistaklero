import "server-only";
import { createHmac } from "node:crypto";
import { getServerEnv } from "@/lib/env.server";

/** Robots conocidos (buscadores, vistas previas de links): no cuentan como vistas. */
const BOTS = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|whatsapp|telegram/i;

export function isBot(userAgent: string | null) {
  return !userAgent || BOTS.test(userAgent);
}

/**
 * Clave de "una vista por persona por día": HMAC con un secreto del servidor y la fecha (UTC) de la
 * cuenta o, sin sesión, de la IP. No se puede revertir ni cruzar entre días, y la base la borra a
 * los dos días: sirve para no contar dos veces, no para saber quién vio.
 */
export function viewKey({ jobId, userId, ip, day = new Date().toISOString().slice(0, 10) }: { jobId: string; userId: string | null; ip: string | null; day?: string }) {
  const who = userId ? `u:${userId}` : ip ? `ip:${ip}` : null;
  if (!who) return null;
  return createHmac("sha256", `${getServerEnv().SUPABASE_SECRET_KEY}:job-views:${day}`).update(`${jobId}|${who}`).digest("hex");
}
