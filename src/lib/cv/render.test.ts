import { readFileSync } from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { type CvData, fitToFont, renderCv, wrap } from "./render";

const fonts = {
  regular: readFileSync("node_modules/geist/dist/fonts/geist-sans/Geist-Regular.ttf"),
  semibold: readFileSync("node_modules/geist/dist/fonts/geist-sans/Geist-SemiBold.ttf"),
};
const labels = {
  about: "Sobre mí",
  experience: "Experiencia",
  education: "Educación",
  projects: "Proyectos",
  certifications: "Certificaciones",
  skills: "Habilidades",
  languages: "Idiomas",
};

const data: CvData = {
  fullName: "Łucía Nguyễn Peña",
  headline: "Desarrolladora Frontend",
  bio: "Me gusta construir interfaces accesibles.",
  location: "Córdoba, Argentina",
  email: "lucia@example.com",
  links: ["https://github.com/lucia"],
  languages: ["español", "inglés"],
  skills: ["React", "TypeScript"],
  experiences: Array.from({ length: 12 }, (_, i) => ({
    title: `Desarrolladora ${i + 1}`,
    company: "Acme",
    period: "mar 2024 – actualidad",
    description: "Construí el sistema de diseño. ".repeat(12),
  })),
  education: [{ degree: "Tecnicatura en Programación", institution: "UTN", period: "2021 – 2023" }],
  projects: [{ title: "Pistaklero", links: ["https://example.com/un-enlace-muy-largo-sin-espacios-que-no-entra-en-una-sola-linea-del-pdf-y-hay-que-partirlo"], description: "Bolsa de empleo." }],
  certifications: [{ name: "Accesibilidad web", detail: "W3C · 2024", url: null }],
};

async function extractText(bytes: Uint8Array) {
  const pdf = await getDocument({ data: bytes.slice(), useSystemFonts: false }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    text += content.items.map((item) => ("str" in item ? item.str : "")).join(" ") + "\n";
  }
  return { text, pages: pdf.numPages };
}

describe("renderCv", () => {
  it("genera un PDF con texto real, en varias páginas si hace falta", async () => {
    const bytes = await renderCv(data, labels, "es", fonts);
    const { text, pages } = await extractText(bytes);
    expect(pages).toBeGreaterThan(1);
    expect(text).toContain("Łucía Nguyễn Peña");
    expect(text).toContain("EXPERIENCIA");
    expect(text).toContain("Desarrolladora 12 · Acme");
    expect(text).toContain("Tecnicatura en Programación · UTN");
    expect(text).toContain("React · TypeScript");

    const doc = await PDFDocument.load(bytes);
    expect(doc.getTitle()).toBe("CV · Łucía Nguyễn Peña");
    expect(doc.getAuthor()).toBe("Łucía Nguyễn Peña");
  });

  it("no deja secciones vacías", async () => {
    const empty = { ...data, bio: "", experiences: [], education: [], projects: [], certifications: [], skills: [], languages: [] };
    const { text } = await extractText(await renderCv(empty, labels, "en", fonts));
    expect(text).not.toContain("EXPERIENCIA");
    expect(text).toContain("Łucía");
  });
});

describe("fitToFont", () => {
  it("cambia lo que la fuente no tiene por su letra base y descarta el resto", () => {
    const supported = new Set([..."abcdeñ ".split("").map((c) => c.codePointAt(0)!)]);
    expect(fitToFont("ễ ñ 🎉 b", supported)).toBe("e ñ  b");
  });
});

describe("wrap", () => {
  it("corta por palabras y parte las palabras larguísimas", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const lines = wrap(`uno dos tres ${"x".repeat(80)}`, font, 10, 100);
    expect(lines[0]).toBe("uno dos tres");
    expect(lines.length).toBeGreaterThan(2);
    for (const line of lines) expect(font.widthOfTextAtSize(line, 10)).toBeLessThanOrEqual(100);
  });
});
