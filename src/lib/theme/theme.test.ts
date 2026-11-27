import { expect, it } from "vitest";
import { DARK_MODE_ENABLED, parseTheme } from "./theme";

it("con el modo oscuro apagado, siempre usa el claro", () => {
  expect(DARK_MODE_ENABLED).toBe(false);
  expect(parseTheme("dark")).toBe("light");
  expect(parseTheme(undefined)).toBe("light");
});

it("con el modo oscuro encendido, solo acepta los temas conocidos y por defecto usa el oscuro", () => {
  expect(parseTheme("light", true)).toBe("light");
  expect(parseTheme("dark", true)).toBe("dark");
  expect(parseTheme("neon", true)).toBe("dark");
  expect(parseTheme(undefined, true)).toBe("dark");
});
