import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CvFonts } from "./render";

// DejaVu Serif (licencia libre, derivada de Bitstream Vera): serif como pide el formato Harvard y con
// todos los acentos (también "ł" o "ễ"). Rutas literales: así la traza del build incluye solo estos
// archivos (y next.config los agrega por las dudas).
const FONTS = path.join(process.cwd(), "node_modules/dejavu-fonts-ttf/ttf");
let cached: Promise<CvFonts> | null = null;

export function loadCvFonts() {
  cached ??= Promise.all([
    readFile(path.join(FONTS, "DejaVuSerif.ttf")),
    readFile(path.join(FONTS, "DejaVuSerif-Bold.ttf")),
    readFile(path.join(FONTS, "DejaVuSerif-Italic.ttf")),
  ]).then(([regular, bold, italic]) => ({ regular, bold, italic }));
  return cached;
}
