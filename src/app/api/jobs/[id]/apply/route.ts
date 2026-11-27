import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/*
 * "Postularme en el sitio original" de una oferta importada: cuenta el clic y redirige.
 * La URL de destino sale de la base (la cargó el admin, siempre https), nunca de la query string:
 * así esta ruta no sirve como redirección abierta.
 */
export async function GET(_request: NextRequest, { params }: RouteContext<"/api/jobs/[id]/apply">) {
  const { id } = await params;
  const home = new URL("/", getPublicEnv().NEXT_PUBLIC_SITE_URL);
  if (!z.uuid().safeParse(id).success) return NextResponse.redirect(home, 303);

  const supabase = await createClient();
  const { data: destination } = await supabase.rpc("record_external_click", { p_job_id: id });
  if (!destination || !destination.startsWith("https://")) return NextResponse.redirect(home, 303);

  return NextResponse.redirect(destination, 303);
}
