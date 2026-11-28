import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InlineMarkdown } from "./inline-markdown";

const render = (text: string) => renderToStaticMarkup(createElement(InlineMarkdown, {} as { children: string }, text));

describe("InlineMarkdown: el título con formato, en una línea", () => {
  it("muestra negrita, cursiva, subrayado, tachado, colores y resaltado, sin párrafos", () => {
    const html = render('**Mi** *primer* <u>trabajo</u> ~~fácil~~ <span data-color="green">verde</span> <mark data-highlight="yellow">ya</mark>');
    expect(html).toBe('<strong>Mi</strong> <em>primer</em> <u>trabajo</u> <s>fácil</s> <span data-color="green">verde</span> <mark data-highlight="yellow">ya</mark>');
  });

  it("los enlaces, listas, encabezados e imágenes quedan como texto o se van", () => {
    expect(render("**Ver** [sitio](https://evil.test) ![gif](https://media.giphy.com/media/a/giphy.gif)")).toBe("<strong>Ver</strong> sitio ");
    // Sin formato no pasa por el Markdown: es texto (React lo escapa), nunca un enlace.
    expect(render("[sitio](https://evil.test)")).toBe("[sitio](https://evil.test)");
    expect(render("1. Cómo **empecé**")).toBe("1. Cómo <strong>empecé</strong>");
    expect(render("# Hashtag **hoy**")).toBe("# Hashtag <strong>hoy</strong>");
  });

  it("descarta scripts, eventos y colores inventados", () => {
    const html = render('<script>alert(1)</script><span data-color="evil" onclick="alert(1)">a</span> **b**');
    expect(html).not.toContain("script");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("evil");
  });

  it("un título sin formato es el texto tal cual (escapado por React)", () => {
    expect(render("Cómo preparé mi entrevista")).toBe("Cómo preparé mi entrevista");
    expect(render("Q&A: <b>hola</b>")).not.toContain("<b>");
  });
});
