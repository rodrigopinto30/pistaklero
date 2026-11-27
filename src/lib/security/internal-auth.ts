import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Autoriza las rutas internas (/api/internal/*): Bearer con OUTBOX_SECRET, o con CRON_SECRET
 * (el que manda Vercel Cron). Compara en tiempo constante.
 */
export function isInternalRequest(header: string | null) {
  if (!header?.startsWith("Bearer ")) return false;
  const given = Buffer.from(header.slice("Bearer ".length));
  return [process.env.OUTBOX_SECRET, process.env.CRON_SECRET]
    .filter((secret): secret is string => Boolean(secret))
    .some((secret) => {
      const expected = Buffer.from(secret);
      return given.length === expected.length && timingSafeEqual(given, expected);
    });
}
