import { describe, expect, it } from "vitest";
import { passwordProblem, passwordRuleChecks } from "./auth";

describe("passwordProblem", () => {
  it("acepta una contraseña con 10+ caracteres, mayúscula, minúscula, número y símbolo", () => {
    expect(passwordProblem("Frase-Segura-2026")).toBeNull();
    expect(passwordProblem("xK2#mPq9zz")).toBeNull();
  });

  it("dice qué falta, en orden", () => {
    expect(passwordProblem("Corta-1")).toBe("too_short");
    expect(passwordProblem("sin-mayuscula-1")).toBe("needs_upper");
    expect(passwordProblem("SIN-MINUSCULA-1")).toBe("needs_lower");
    expect(passwordProblem("Sin-Numeros-Aca")).toBe("needs_digit");
    expect(passwordProblem("SinSimbolos2026")).toBe("needs_symbol");
  });

  it("las más usadas se aceptan si cumplen las reglas (lo decide la persona)", () => {
    expect(passwordProblem("Password123!")).toBeNull();
  });

  it("no pasa de 72 bytes (el límite de bcrypt)", () => {
    expect(passwordProblem(`Aa1!${"a".repeat(68)}`)).toBeNull();
    expect(passwordProblem(`Aa1!${"a".repeat(69)}`)).toBe("too_long");
  });

  it("no puede ser el email ni lo de antes de la @", () => {
    expect(passwordProblem("Ana.Perez@empresa.com1", "ana.perez@empresa.com1")).toBe("same_as_email");
    expect(passwordProblem("AnaPerez-2026", "ana.perez@empresa.com")).toBe("same_as_email");
    expect(passwordProblem("AnaPerez-2026", "rrhh@empresa.com")).toBeNull();
  });

  it("la lista de reglas se tilda de a una", () => {
    expect(passwordRuleChecks("a")).toEqual({ length: false, upper: false, lower: true, digit: false, symbol: false });
    expect(passwordRuleChecks("Abcdefghi1!")).toEqual({ length: true, upper: true, lower: true, digit: true, symbol: true });
  });
});
