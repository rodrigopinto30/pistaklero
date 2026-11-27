import { NextResponse } from "next/server";
import { flushOutbox } from "@/lib/email/outbox";
import { isInternalRequest } from "@/lib/security/internal-auth";

/** Vacía la cola de emails. Protegida con un secreto. */
export async function POST(request: Request) {
  if (!isInternalRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await flushOutbox(50));
}
