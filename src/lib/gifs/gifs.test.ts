import { describe, expect, it } from "vitest";
import { countGifs, gifMarkdown, isGiphyUrl, stripImages, withinGifLimit } from "./gifs";

const gif = (n: number) => `![GIF: perrito ${n}](https://media.giphy.com/media/abc${n}/giphy.gif)`;

describe("GIFs en los textos", () => {
  it("solo cuentan las imágenes de GIPHY", () => {
    expect(isGiphyUrl("https://media2.giphy.com/media/x/giphy.gif")).toBe(true);
    expect(isGiphyUrl("https://i.giphy.com/x.gif")).toBe(true);
    expect(isGiphyUrl("http://media.giphy.com/x.gif")).toBe(false);
    expect(isGiphyUrl("https://giphy.com.evil.example/x.gif")).toBe(false);
    expect(countGifs(`Hola ${gif(1)}\n\n![otra](https://example.com/a.png)`)).toBe(1);
  });

  it("hasta 3 por texto", () => {
    expect(withinGifLimit([1, 2, 3].map(gif).join("\n\n"))).toBe(true);
    expect(withinGifLimit([1, 2, 3, 4].map(gif).join("\n\n"))).toBe(false);
  });

  it("el título va como texto alternativo, sin corchetes", () => {
    expect(gifMarkdown({ title: "a [b] c", url: "https://media.giphy.com/x.gif" })).toBe("![GIF: a b c](https://media.giphy.com/x.gif)");
  });

  it("para el CV se sacan las imágenes", () => {
    expect(stripImages(`Me encanta programar 🚀 ${gif(1)} y aprender.`)).toBe("Me encanta programar 🚀 y aprender.");
  });
});
