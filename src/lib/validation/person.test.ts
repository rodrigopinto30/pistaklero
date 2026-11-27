import { describe, expect, it } from "vitest";
import { personNameSchema, splitFullName } from "./person";

describe("personNameSchema", () => {
  it("recorta los espacios y acepta el segundo nombre vacío", () => {
    expect(personNameSchema.parse({ firstName: " Ana ", middleName: "", lastName: " Pérez " })).toEqual({
      firstName: "Ana",
      middleName: "",
      lastName: "Pérez",
    });
  });

  it("pide nombre y apellido, y hasta 50 caracteres en cada campo", () => {
    expect(personNameSchema.safeParse({ firstName: "Ana", middleName: "", lastName: " " }).success).toBe(false);
    expect(personNameSchema.safeParse({ firstName: "", middleName: "", lastName: "Pérez" }).success).toBe(false);
    expect(personNameSchema.safeParse({ firstName: "a".repeat(51), middleName: "", lastName: "Pérez" }).success).toBe(false);
  });
});

describe("splitFullName", () => {
  it("la primera palabra es el nombre y el resto, el apellido", () => {
    expect(splitFullName("Ana María  Pérez")).toEqual({ firstName: "Ana", lastName: "María Pérez" });
    expect(splitFullName("Ana")).toEqual({ firstName: "Ana", lastName: "" });
    expect(splitFullName(null)).toEqual({ firstName: "", lastName: "" });
  });
});
