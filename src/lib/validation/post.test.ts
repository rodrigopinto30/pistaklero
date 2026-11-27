import { expect, it } from "vitest";
import { postSchema } from "./post";

it("pide un título de 5 a 120 caracteres y un texto de 20 a 5000", () => {
  expect(postSchema.safeParse({ title: " Cómo armar tu CV ", body: "Un consejo con suficiente texto.", language: "es" }).data?.title).toBe("Cómo armar tu CV");
  expect(postSchema.safeParse({ title: "CV", body: "Un consejo con suficiente texto.", language: "es" }).success).toBe(false);
  expect(postSchema.safeParse({ title: "Cómo armar tu CV", body: "Muy corto", language: "es" }).success).toBe(false);
  expect(postSchema.safeParse({ title: "Cómo armar tu CV", body: "Un consejo con suficiente texto.", language: "fr" }).success).toBe(false);
});
