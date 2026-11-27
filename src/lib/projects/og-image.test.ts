import { describe, expect, it } from "vitest";
import { findPreviewImage } from "./og-image";

describe("findPreviewImage", () => {
  it("toma og:image y resuelve rutas relativas", () => {
    const html = `<html><head><meta property="og:title" content="x"><meta property="og:image" content="/img/cover.png?a=1&amp;b=2"></head></html>`;
    expect(findPreviewImage(html, "https://example.com/proyecto/")).toBe("https://example.com/img/cover.png?a=1&b=2");
  });

  it("prefiere la versión segura y acepta el orden de atributos al revés", () => {
    const html = `<meta content='https://cdn.example.com/a.jpg' property='og:image'><meta property="og:image:secure_url" content="https://cdn.example.com/b.jpg">`;
    expect(findPreviewImage(html, "https://example.com")).toBe("https://cdn.example.com/b.jpg");
  });

  it("usa twitter:image si no hay Open Graph", () => {
    expect(findPreviewImage(`<meta name="twitter:image" content="https://example.com/t.webp">`, "https://example.com")).toBe("https://example.com/t.webp");
  });

  it("ignora imágenes que no son https", () => {
    expect(findPreviewImage(`<meta property="og:image" content="http://example.com/a.png">`, "https://example.com")).toBeNull();
    expect(findPreviewImage(`<meta property="og:image" content="javascript:alert(1)">`, "https://example.com")).toBeNull();
    expect(findPreviewImage(`<title>Sin vista previa</title>`, "https://example.com")).toBeNull();
  });
});
