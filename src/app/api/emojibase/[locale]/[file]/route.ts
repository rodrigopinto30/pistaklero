import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

/*
 * Datos de emojis (Emojibase) para el selector, servidos desde el propio sitio: así el navegador no
 * le pide nada a un CDN de terceros (privacidad y CSP). Solo estos archivos y estos idiomas.
 */
const LOCALES = ["es", "en"] as const;
const FILES = ["data.json", "messages.json"] as const;

export async function GET(_request: Request, { params }: RouteContext<"/api/emojibase/[locale]/[file]">) {
  const { locale, file } = await params;
  if (!(LOCALES as readonly string[]).includes(locale) || !(FILES as readonly string[]).includes(file)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const body = await readFile(path.join(process.cwd(), "node_modules/emojibase-data", locale, file), "utf8");
  return new NextResponse(body, {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=86400, immutable" },
  });
}
