import { describe, expect, it } from "vitest";
import { companyDetailsSchema } from "./company";

const base = { name: "Acme", description: "", industry: "", size: "", stage: "", country: "", city: "", linkedinUrl: "", xUrl: "", instagramUrl: "" };

describe("companyDetailsSchema", () => {
  it("acepta los campos vacíos como no informados", () => {
    const result = companyDetailsSchema.parse(base);
    expect(result.size).toBeUndefined();
    expect(result.stage).toBeUndefined();
    expect(result.linkedinUrl).toBeUndefined();
  });

  it("acepta etapa y tamaño válidos", () => {
    const result = companyDetailsSchema.parse({ ...base, size: "11-50", stage: "seed", country: "AR" });
    expect(result).toMatchObject({ size: "11-50", stage: "seed", country: "AR" });
  });

  it.each([{ size: "2-5" }, { stage: "series_z" }, { name: "A" }, { instagramUrl: "javascript:alert(1)" }])(
    "rechaza %o",
    (override) => {
      expect(companyDetailsSchema.safeParse({ ...base, ...override }).success).toBe(false);
    }
  );
});
