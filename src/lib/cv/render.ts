import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFFont, type PDFPage, rgb } from "pdf-lib";

/*
 * CV en PDF: una columna, sin tablas ni imágenes, con texto real (no una captura). Así lo leen bien
 * los sistemas de selección (ATS) y los lectores de pantalla pueden extraer el texto.
 */
export type CvData = {
  fullName: string;
  headline: string;
  bio: string;
  location: string | null;
  email: string | null;
  links: string[];
  languages: string[];
  skills: string[];
  experiences: { title: string; company: string; period: string; description: string }[];
  education: { degree: string; institution: string; period: string }[];
  projects: { title: string; links: string[]; description: string }[];
  certifications: { name: string; detail: string; url: string | null }[];
};

export type CvLabels = {
  about: string;
  experience: string;
  education: string;
  projects: string;
  certifications: string;
  skills: string;
  languages: string;
};

export type CvFonts = { regular: Uint8Array; semibold: Uint8Array };

const PAGE: [number, number] = [595.28, 841.89]; // A4
const MARGIN = 50;
const WIDTH = PAGE[0] - MARGIN * 2;
const INK = rgb(0.07, 0.08, 0.08);
const MUTED = rgb(0.33, 0.36, 0.34);
const ACCENT = rgb(0.24, 0.42, 0.04); // el lima del modo claro (#3d6b0a)

/** Deja solo caracteres que la fuente puede dibujar: "ễ" sin glifo pasa a "e" en vez de un cuadrado vacío. */
export function fitToFont(text: string, supported: Set<number>) {
  let out = "";
  for (const char of text.normalize("NFC")) {
    const code = char.codePointAt(0)!;
    if (char === "\n" || supported.has(code)) {
      out += char;
      continue;
    }
    const base = char.normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (base && [...base].every((c) => supported.has(c.codePointAt(0)!))) out += base;
  }
  return out;
}

/** Corta un texto en líneas que entran en `width`; las palabras demasiado largas (URLs) se parten. */
export function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > width) {
        let cut = rest.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > width) cut--;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    lines.push(line);
  }
  // Sin líneas vacías al final, y nunca dos seguidas.
  return lines.filter((line, i) => line !== "" || (i > 0 && lines[i - 1] !== "" && i < lines.length - 1));
}

class Writer {
  private page: PDFPage;
  private y: number;

  constructor(
    private readonly doc: PDFDocument,
    private readonly fonts: { regular: PDFFont; semibold: PDFFont },
    private readonly supported: Set<number>
  ) {
    this.page = doc.addPage(PAGE);
    this.y = PAGE[1] - MARGIN;
  }

  private ensure(height: number) {
    if (this.y - height >= MARGIN) return;
    this.page = this.doc.addPage(PAGE);
    this.y = PAGE[1] - MARGIN;
  }

  space(height: number) {
    this.y -= height;
  }

  text(value: string, { size = 10, bold = false, color = INK, indent = 0, after = 0 } = {}) {
    const font = bold ? this.fonts.semibold : this.fonts.regular;
    const lineHeight = size * 1.35;
    for (const line of wrap(fitToFont(value, this.supported), font, size, WIDTH - indent)) {
      this.ensure(lineHeight);
      this.y -= lineHeight;
      if (line) this.page.drawText(line, { x: MARGIN + indent, y: this.y + size * 0.3, size, font, color });
    }
    this.y -= after;
  }

  heading(value: string) {
    // Un título nunca queda solo al pie de la página.
    this.ensure(48);
    this.space(14);
    this.text(value.toUpperCase(), { size: 10.5, bold: true, color: ACCENT });
    this.page.drawLine({
      start: { x: MARGIN, y: this.y - 3 },
      end: { x: MARGIN + WIDTH, y: this.y - 3 },
      thickness: 0.6,
      color: ACCENT,
    });
    this.space(9);
  }
}

export async function renderCv(data: CvData, labels: CvLabels, locale: "es" | "en", fontBytes: CvFonts) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(fontBytes.regular, { subset: true });
  const semibold = await doc.embedFont(fontBytes.semibold, { subset: true });
  const supported = new Set(regular.getCharacterSet());

  doc.setTitle(`CV · ${fitToFont(data.fullName, supported)}`, { showInWindowTitleBar: true });
  doc.setAuthor(data.fullName);
  doc.setCreator("Pistaklero");
  doc.setProducer("Pistaklero");
  doc.setLanguage(locale === "es" ? "es" : "en");

  const w = new Writer(doc, { regular, semibold }, supported);

  w.text(data.fullName, { size: 22, bold: true, after: 2 });
  if (data.headline) w.text(data.headline, { size: 12, color: MUTED, after: 4 });
  const contact = [data.location, data.email].filter(Boolean).join("  ·  ");
  if (contact) w.text(contact, { size: 9.5, color: MUTED });
  for (const link of data.links) w.text(link, { size: 9.5, color: MUTED });

  if (data.bio) {
    w.heading(labels.about);
    w.text(data.bio);
  }

  if (data.experiences.length > 0) {
    w.heading(labels.experience);
    for (const e of data.experiences) {
      w.text(`${e.title} · ${e.company}`, { size: 10.5, bold: true });
      w.text(e.period, { size: 9, color: MUTED, after: 2 });
      if (e.description) w.text(e.description, { after: 2 });
      w.space(6);
    }
  }

  if (data.education.length > 0) {
    w.heading(labels.education);
    for (const e of data.education) {
      w.text(`${e.degree} · ${e.institution}`, { size: 10.5, bold: true });
      w.text(e.period, { size: 9, color: MUTED, after: 6 });
    }
  }

  if (data.projects.length > 0) {
    w.heading(labels.projects);
    for (const p of data.projects) {
      w.text(p.title, { size: 10.5, bold: true });
      for (const link of p.links) w.text(link, { size: 9, color: MUTED });
      if (p.description) w.text(p.description);
      w.space(6);
    }
  }

  if (data.certifications.length > 0) {
    w.heading(labels.certifications);
    for (const c of data.certifications) {
      w.text(c.name, { size: 10.5, bold: true });
      const detail = [c.detail, c.url].filter(Boolean).join("  ·  ");
      if (detail) w.text(detail, { size: 9, color: MUTED });
      w.space(6);
    }
  }

  if (data.skills.length > 0) {
    w.heading(labels.skills);
    w.text(data.skills.join(" · "));
  }

  if (data.languages.length > 0) {
    w.heading(labels.languages);
    w.text(data.languages.join(" · "));
  }

  return doc.save();
}
