import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

// "Descargar mis datos": todo lo de la cuenta en un JSON (derecho de acceso, Ley 25.326 / GDPR).
export async function GET() {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("export_my_data");
  if (error) return NextResponse.json({ error: "unavailable" }, { status: 500 });

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="pistaklero-mis-datos.json"`,
      // Datos personales: que no los guarde ninguna caché intermedia.
      "Cache-Control": "no-store",
    },
  });
}
