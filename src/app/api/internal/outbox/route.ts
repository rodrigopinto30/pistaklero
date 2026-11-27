import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { flushOutbox } from "@/lib/email/outbox";

/** Compara el secreto en tiempo constante (no se puede adivinar por cuánto tarda la respuesta). */
function isAuthorized(header: string | null) {
  const secret = process.env.OUTBOX_SECRET;
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const given = Buffer.from(header.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Vacía la cola de emails. La llama el cron (pg_cron + pg_net o Vercel Cron) con el secreto. */
export async function POST(request: Request) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await flushOutbox(50);
  return NextResponse.json(result);
}
