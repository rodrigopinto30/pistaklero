import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "@/lib/security/same-origin";
import { createClient } from "@/lib/supabase/server";

const body = z.object({ ids: z.array(z.uuid()).min(1).max(50) });

/**
 * La empresa vio estas postulaciones (sus tarjetas quedaron a la vista): pasan a "Vista" y la
 * candidata recibe el aviso. La llaman sola las tarjetas; es una ruta (no una Server Action) para
 * que una llamada que sale justo al irse de la página no termine en la URL de otra.
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return new NextResponse(null, { status: 403 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_applications_viewed", { p_application_ids: parsed.data.ids });
  if (error) console.error("mark_applications_viewed falló", { code: error.code });
  return new NextResponse(null, { status: error ? 400 : 204 });
}
