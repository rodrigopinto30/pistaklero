import { describe, expect, it } from "vitest";
import { plainInline } from "./text";

describe("plainInline: el título sin formato", () => {
  it("saca negrita, cursiva, subrayado, tachado, colores y resaltado", () => {
    expect(plainInline('**Cómo** *armé* <u>mi</u> ~~primer~~ <span data-color="red">CV</span> <mark data-highlight="yellow">ya</mark>')).toBe("Cómo armé mi primer CV ya");
  });

  it("deja los caracteres escapados tal cual y los emojis", () => {
    expect(plainInline("5\\*3 = 15 y C\\_plus 🎉")).toBe("5*3 = 15 y C_plus 🎉");
    expect(plainInline("Q&amp;A: &lt;html&gt;")).toBe("Q&A: <html>");
  });

  it("un título viejo sin formato queda igual", () => {
    expect(plainInline("  Cómo preparé mi primera entrevista  ")).toBe("Cómo preparé mi primera entrevista");
  });
});
