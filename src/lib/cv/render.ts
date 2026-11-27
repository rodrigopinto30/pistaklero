import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFFont, type PDFPage, rgb } from "pdf-lib";

/*
 * CV en formato Harvard (el de la Office of Career Services de Harvard):
 *   - una columna, tipografía serif, todo en negro;
 *   - el nombre centrado arriba y, debajo, los datos de contacto en una línea;
 *   - secciones con el título en negrita y una línea debajo; primero la formación;
 *   - en cada entrada, la organización en negrita a la izquierda y las fechas a la derecha,
 *     el cargo o título en cursiva y los logros como viñetas.
 * Texto real (no una imagen): lo leen bien los sistemas de selección (ATS) y los lectores de pantalla.
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
  skillsSection: string;
};

export type CvFonts = { regular: Uint8Array; bold: Uint8Array; italic: Uint8Array };

const PAGE: [number, number] = [595.28, 841.89]; // A4
const MARGIN = 54; // 0,75"
const WIDTH = PAGE[0] - MARGIN * 2;
const BLACK = rgb(0, 0, 0);
const BULLET_INDENT = 14;

/** Deja solo caracteres que la fuente puede dibujar: lo que no tiene pasa a su letra base o se descarta. */
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

/** Logros como viñetas: una por línea (sin el guion o punto que la persona haya escrito al principio). */
export function toBullets(description: string) {
  return description
    .split("\n")
    .map((line) => line.replace(/^\s*[-•*·]\s*/, "").trim())
    .filter(Boolean);
}

type Style = "regular" | "bold" | "italic";

class Writer {
  private page: PDFPage;
  private y: number;

  constructor(
    private readonly doc: PDFDocument,
    private readonly fonts: Record<Style, PDFFont>,
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

  private fit(value: string) {
    return fitToFont(value, this.supported);
  }

  space(height: number) {
    this.y -= height;
  }

  /** Texto en una o más líneas; `align: "center"` para el encabezado. */
  text(value: string, { size = 10.5, style = "regular" as Style, indent = 0, align = "left" as "left" | "center", after = 0 } = {}) {
    const font = this.fonts[style];
    const lineHeight = size * 1.3;
    for (const line of wrap(this.fit(value), font, size, WIDTH - indent)) {
      this.ensure(lineHeight);
      this.y -= lineHeight;
      if (!line) continue;
      const x = align === "center" ? MARGIN + (WIDTH - font.widthOfTextAtSize(line, size)) / 2 : MARGIN + indent;
      this.page.drawText(line, { x, y: this.y + size * 0.25, size, font, color: BLACK });
    }
    this.y -= after;
  }

  /** Una fila: a la izquierda (puede ocupar varias líneas) y, alineado a la derecha, un dato corto (fechas). */
  row(left: string, right: string, { size = 10.5, style = "regular" as Style } = {}) {
    const font = this.fonts[style];
    const rightText = this.fit(right);
    const rightWidth = rightText ? this.fonts.regular.widthOfTextAtSize(rightText, size) : 0;
    const lines = wrap(this.fit(left), font, size, WIDTH - rightWidth - (rightText ? 12 : 0));
    const lineHeight = size * 1.3;
    lines.forEach((line, i) => {
      this.ensure(lineHeight);
      this.y -= lineHeight;
      this.page.drawText(line, { x: MARGIN, y: this.y + size * 0.25, size, font, color: BLACK });
      if (i === 0 && rightText) {
        this.page.drawText(rightText, { x: MARGIN + WIDTH - rightWidth, y: this.y + size * 0.25, size, font: this.fonts.regular, color: BLACK });
      }
    });
  }

  bullets(items: string[], size = 10.5) {
    for (const item of items) {
      const lines = wrap(this.fit(item), this.fonts.regular, size, WIDTH - BULLET_INDENT);
      const lineHeight = size * 1.3;
      lines.forEach((line, i) => {
        this.ensure(lineHeight);
        this.y -= lineHeight;
        if (i === 0) this.page.drawText("•", { x: MARGIN + 3, y: this.y + size * 0.25, size, font: this.fonts.regular, color: BLACK });
        this.page.drawText(line, { x: MARGIN + BULLET_INDENT, y: this.y + size * 0.25, size, font: this.fonts.regular, color: BLACK });
      });
    }
  }

  heading(value: string) {
    // Un título nunca queda solo al pie de la página.
    this.ensure(52);
    this.space(12);
    this.text(value, { size: 11.5, style: "bold" });
    this.page.drawLine({ start: { x: MARGIN, y: this.y - 2 }, end: { x: MARGIN + WIDTH, y: this.y - 2 }, thickness: 0.7, color: BLACK });
    this.space(6);
  }
}

export async function renderCv(data: CvData, labels: CvLabels, locale: "es" | "en", fontBytes: CvFonts) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fonts = {
    regular: await doc.embedFont(fontBytes.regular, { subset: true }),
    bold: await doc.embedFont(fontBytes.bold, { subset: true }),
    italic: await doc.embedFont(fontBytes.italic, { subset: true }),
  };
  const supported = new Set(fonts.regular.getCharacterSet());

  doc.setTitle(`CV · ${fitToFont(data.fullName, supported)}`, { showInWindowTitleBar: true });
  doc.setAuthor(data.fullName);
  doc.setCreator("Pistaklero");
  doc.setProducer("Pistaklero");
  doc.setLanguage(locale === "es" ? "es" : "en");

  const w = new Writer(doc, fonts, supported);

  // Encabezado centrado: nombre, una línea de contacto y el titular.
  w.text(data.fullName, { size: 18, style: "bold", align: "center", after: 2 });
  const contact = [data.location, data.email, ...data.links.map((link) => link.replace(/^https?:\/\//, ""))].filter(Boolean).join("  •  ");
  if (contact) w.text(contact, { size: 10, align: "center" });
  if (data.headline) w.text(data.headline, { size: 10.5, style: "italic", align: "center" });

  if (data.bio) {
    w.heading(labels.about);
    w.text(data.bio);
  }

  // Harvard: la formación va primero.
  if (data.education.length > 0) {
    w.heading(labels.education);
    for (const e of data.education) {
      w.row(e.institution, e.period, { style: "bold" });
      w.text(e.degree, { style: "italic", after: 5 });
    }
  }

  if (data.experiences.length > 0) {
    w.heading(labels.experience);
    for (const e of data.experiences) {
      w.row(e.company, e.period, { style: "bold" });
      w.text(e.title, { style: "italic" });
      w.bullets(toBullets(e.description));
      w.space(5);
    }
  }

  if (data.projects.length > 0) {
    w.heading(labels.projects);
    for (const p of data.projects) {
      w.text(p.title, { style: "bold" });
      for (const link of p.links) w.text(link.replace(/^https?:\/\//, ""), { size: 9.5, style: "italic" });
      w.bullets(toBullets(p.description));
      w.space(5);
    }
  }

  if (data.certifications.length > 0) {
    w.heading(labels.certifications);
    for (const c of data.certifications) {
      w.row(c.name, c.detail, { style: "bold" });
      if (c.url) w.text(c.url.replace(/^https?:\/\//, ""), { size: 9.5, style: "italic" });
      w.space(3);
    }
  }

  // "Habilidades e idiomas", una línea por tipo (como el modelo de Harvard).
  if (data.skills.length > 0 || data.languages.length > 0) {
    w.heading(labels.skillsSection);
    for (const [label, values] of [
      [labels.skills, data.skills],
      [labels.languages, data.languages],
    ] as const) {
      if (values.length > 0) w.text(`${label}: ${values.join(", ")}`);
    }
  }

  return doc.save();
}
