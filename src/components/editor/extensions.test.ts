import { MarkdownManager } from "@tiptap/markdown";
import { describe, expect, it } from "vitest";
import { editorExtensions } from "./extensions";

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
