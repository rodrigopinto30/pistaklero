import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { CvFonts } from "./render";

// Geist (licencia OFL), la misma tipografía del sitio. Rutas literales: así la traza del build
// incluye solo estos dos archivos (y next.config los agrega por las dudas).
let cached: Promise<CvFonts> | null = null;

export function loadCvFonts() {
  cached ??= Promise.all([
    readFile(path.join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans/Geist-Regular.ttf")),
    readFile(path.join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans/Geist-SemiBold.ttf")),
  ]).then(([regular, semibold]) => ({ regular, semibold }));
  return cached;
}
