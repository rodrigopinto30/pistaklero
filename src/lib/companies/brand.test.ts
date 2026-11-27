import { expect, it } from "vitest";
import { brandGradient, brandHue } from "./brand";

it("cada empresa tiene siempre el mismo tono, y empresas distintas suelen tener tonos distintos", () => {
  expect(brandHue("Acme")).toBe(brandHue("acme"));
  expect(brandHue("Acme")).not.toBe(brandHue("Cohetes SA"));
  expect(brandHue("Acme")).toBeGreaterThanOrEqual(0);
  expect(brandHue("Acme")).toBeLessThan(360);
  expect(brandGradient("Acme")).toMatch(/^linear-gradient\(135deg, hsl\(\d+ 42% 34%\), hsl\(\d+ 48% 20%\)\)$/);
});
