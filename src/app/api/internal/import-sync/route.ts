import { NextResponse } from "next/server";
import { syncAllImportSources } from "@/lib/import/sync";
import { isInternalRequest } from "@/lib/security/internal-auth";

/** Sincronización diaria de los tableros de Greenhouse, Lever, Ashby y Workable (Vercel Cron, con secreto). */
export async function GET(request: Request) {
  if (!isInternalRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await syncAllImportSources());
}
