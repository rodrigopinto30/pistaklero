import { describe, expect, it } from "vitest";
import { safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it.each(["/es", "/es/empleos?pagina=2", "/en/jobs#detalle"])("acepta la ruta interna %s", (path) => {
    expect(safeNextPath(path, "/es")).toBe(path);
  });

  it.each([
    ["URL absoluta", "https://phishing.com"],
    ["protocolo relativo", "//phishing.com"],
    ["barra invertida", "/\\phishing.com"],
    ["barra invertida codificada en el medio", "/es\\..\\//phishing.com"],
    ["javascript:", "javascript:alert(1)"],
    ["salto de línea", "/es\n//phishing.com"],
    ["tabulación", "/\t/phishing.com"],
    ["sin barra inicial", "es/empleos"],
    ["vacía", ""],
    ["no es texto", 123],
    ["demasiado larga", `/${"a".repeat(600)}`],
  ])("rechaza %s", (_, value) => {
    expect(safeNextPath(value, "/es")).toBe("/es");
  });
});
