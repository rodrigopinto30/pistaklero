import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Markdown } from "./markdown";

const render = (text: string) => renderToStaticMarkup(createElement(Markdown, {} as { children: string }, text));

describe("Markdown: lo que escribe el editor, limpio", () => {
  it("muestra subrayado, tachado, colores y resaltado de la paleta", () => {
    const html = render('<u>sub</u> ~~tachado~~ <span data-color="green">verde</span> <mark data-highlight="yellow">res</mark> **negrita**');
    expect(html).toContain("<u>sub</u>");
    expect(html).toContain("<s>tachado</s>");
    expect(html).toContain('<span data-color="green">verde</span>');
    expect(html).toContain('<mark data-highlight="yellow">res</mark>');
    expect(html).toContain("<strong>negrita</strong>");
  });

  it("descarta scripts, eventos, estilos, colores inventados e imágenes que no son de GIPHY", () => {
    const html = render(
      '<script>alert(1)</script><span data-color="red" style="color:red" onclick="alert(1)">a</span><span data-color="evil">b</span><img src="https://evil.test/x.png" onerror="alert(1)"><iframe src="https://evil.test"></iframe>'
    );
    expect(html).not.toMatch(/<script|onclick|onerror|style=|<iframe|evil\.test/);
    expect(html).toContain('<span data-color="red">a</span>');
    expect(html).not.toContain('data-color="evil"');
  });

  it("los enlaces son http, https o mailto y no siguen a nadie", () => {
    const html = render("[bien](https://acme.com) [mal](javascript:alert(1))");
    expect(html).toContain('href="https://acme.com"');
    expect(html).toContain('rel="nofollow ugc noopener noreferrer"');
    expect(html).not.toContain("javascript:");
  });
});
