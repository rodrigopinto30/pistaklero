import { describe, expect, it } from "vitest";
import { passwordProblem } from "./password";

describe("passwordProblem", () => {
  it("acepta frases y cualquier carácter, sin reglas de composición", () => {
    expect(passwordProblem("una frase larga que recuerdo")).toBeNull();
    expect(passwordProblem("ñandú con 🌧️ y espacios")).toBeNull();
    expect(passwordProblem("xk2#mPq9")).toBeNull();
  });

  it("pide al menos 8 caracteres (los emojis cuentan como uno)", () => {
    expect(passwordProblem("corta12")).toBe("too_short");
    expect(passwordProblem("🌧️🌧️🌧️")).toBe("too_short");
  });

  it("no pasa de 72 bytes (el límite de bcrypt)", () => {
    expect(passwordProblem("a".repeat(72))).toBeNull();
    expect(passwordProblem("a".repeat(73))).toBe("too_long");
    expect(passwordProblem("ñ".repeat(37))).toBe("too_long");
  });

  it("rechaza las contraseñas más comunes, sin importar mayúsculas", () => {
    expect(passwordProblem("password")).toBe("too_common");
    expect(passwordProblem("12345678")).toBe("too_common");
    expect(passwordProblem("Qwerty123")).toBe("too_common");
    expect(passwordProblem("Pistaklero2026!")).toBe("too_common");
    expect(passwordProblem("Contraseña123")).toBe("too_common");
  });

  it("no puede ser el email ni lo de antes de la @", () => {
    expect(passwordProblem("ana.perez@empresa.com", "ana.perez@empresa.com")).toBe("same_as_email");
    expect(passwordProblem("AnaPerez2026", "ana.perez@empresa.com")).toBe("same_as_email");
    expect(passwordProblem("AnaPerez2026", "rrhh@empresa.com")).toBeNull();
  });
});
