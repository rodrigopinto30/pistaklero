import { expect, it } from "vitest";
import { postSchema } from "./post";

it("pide un título de 5 a 120 caracteres y un texto de 20 a 5000", () => {
  expect(postSchema.safeParse({ title: " Cómo armar tu CV ", body: "Un consejo con suficiente texto.", language: "es" }).data?.title).toBe("Cómo armar tu CV");
  expect(postSchema.safeParse({ title: "CV", body: "Un consejo con suficiente texto.", language: "es" }).success).toBe(false);
  expect(postSchema.safeParse({ title: "Cómo armar tu CV", body: "Muy corto", language: "es" }).success).toBe(false);
  expect(postSchema.safeParse({ title: "Cómo armar tu CV", body: "Un consejo con suficiente texto.", language: "fr" }).success).toBe(false);
});

it("el título admite formato: los límites cuentan lo que se lee y queda en una línea", () => {
  const body = "Un consejo con suficiente texto.";
  const formatted = '**Cómo** armar tu <span data-color="red">CV</span>';
  expect(postSchema.safeParse({ title: formatted, body, language: "es" }).data?.title).toBe(formatted);
  // "**CV**" se lee "CV": muy corto, aunque con los símbolos sean 6 caracteres.
  expect(postSchema.safeParse({ title: "**CV**", body, language: "es" }).success).toBe(false);
  expect(postSchema.safeParse({ title: `**${"a".repeat(120)}**`, body, language: "es" }).success).toBe(true);
  expect(postSchema.safeParse({ title: "a".repeat(121), body, language: "es" }).success).toBe(false);
  expect(postSchema.safeParse({ title: "Una línea\r\ny otra", body, language: "es" }).data?.title).toBe("Una línea y otra");
});
