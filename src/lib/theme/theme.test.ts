import { expect, it } from "vitest";
import { parseTheme } from "./theme";

it("solo acepta los temas conocidos y por defecto usa el oscuro", () => {
  expect(parseTheme("light")).toBe("light");
  expect(parseTheme("dark")).toBe("dark");
  expect(parseTheme("neon")).toBe("dark");
  expect(parseTheme(undefined)).toBe("dark");
});
