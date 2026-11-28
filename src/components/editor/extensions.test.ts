import { MarkdownManager } from "@tiptap/markdown";
import { describe, expect, it } from "vitest";
import { plainInline } from "@/lib/editor/text";
import { editorExtensions, titleExtensions } from "./extensions";

const markdown = new MarkdownManager({ extensions: editorExtensions() });
const roundTrip = (text: string) => markdown.serialize(markdown.parse(text)).trim();

describe("editor: Markdown → editor → Markdown", () => {
  it("conserva negrita, cursiva, subrayado, tachado, colores y resaltado", () => {
    const text = 'Hola **negrita**, *cursiva*, <u>subrayado</u>, ~~tachado~~, <span data-color="red">rojo</span> y <mark data-highlight="yellow">resaltado</mark>.';
    expect(roundTrip(text)).toBe(text);
  });

  it("conserva títulos, listas, citas y enlaces", () => {
    const text = "## Qué buscamos\n\n- React\n- TypeScript\n\n1. Uno\n2. Dos\n\n> Una cita\n\n[Nuestro sitio](https://acme.com)";
    expect(roundTrip(text)).toBe(text);
  });

  it("un color que no es de la paleta queda como texto escapado, nunca como etiqueta", () => {
    expect(roundTrip('<span data-color="javascript">texto</span>')).not.toContain('<span data-color="javascript">');
  });

  it("conserva los GIFs de GIPHY", () => {
    const gif = "![GIF: hola](https://media.giphy.com/media/abc/giphy.gif)";
    expect(roundTrip(gif)).toBe(gif);
  });
});

describe("título: Markdown → editor → Markdown (una línea)", () => {
  const title = new MarkdownManager({ extensions: titleExtensions() });
  const titleTrip = (text: string) => title.serialize(title.parse(text)).trim();

  it("conserva el formato del texto", () => {
    const text = '**Cómo** *armé* <u>mi</u> ~~primer~~ <span data-color="red">CV</span> y <mark data-highlight="yellow">ya</mark> 🎉';
    expect(titleTrip(text)).toBe(text);
  });

  it("un título viejo sin formato queda igual", () => {
    expect(titleTrip("Cómo preparé mi primera entrevista")).toBe("Cómo preparé mi primera entrevista");
  });

  it("los caracteres especiales son texto: se escapan, vuelven iguales y se leen sin las barras", () => {
    for (const text of ["5*3 = 15 y my_var_name", "Q&A: <html> y C++", "1. Cómo empecé", "# Hashtag", "- Guion", "> Cita", "[algo](x) ~tilde~"]) {
      const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] };
      const markdown = title.serialize(doc as never).trim();
      expect(plainInline(markdown)).toBe(text);
      expect(titleTrip(markdown)).toBe(markdown);
    }
  });
});
