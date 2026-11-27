import { describe, expect, it } from "vitest";
import { onboardingSchema } from "./onboarding";

describe("onboardingSchema", () => {
  it("acepta una candidata con nombre y titular", () => {
    const result = onboardingSchema.parse({ role: "candidate", fullName: "  Ana Pérez ", headline: "Frontend" });
    expect(result).toEqual({ role: "candidate", fullName: "Ana Pérez", headline: "Frontend" });
  });

  it("exige un nombre de al menos 2 caracteres", () => {
    expect(onboardingSchema.safeParse({ role: "candidate", fullName: "A", headline: "" }).success).toBe(false);
  });

  it.each([
    ["acme.com", "https://acme.com"],
    ["http://acme.com/empleos", "https://acme.com/empleos"],
    ["https://www.acme.com.ar", "https://www.acme.com.ar"],
  ])("normaliza el sitio %s a https", (input, expected) => {
    const result = onboardingSchema.parse({ role: "recruiter", companyName: "Acme", websiteUrl: input });
    expect(result.role === "recruiter" && result.websiteUrl).toBe(expected);
  });

  it("permite una empresa sin sitio web", () => {
    const result = onboardingSchema.parse({ role: "recruiter", companyName: "Acme", websiteUrl: "" });
    expect(result.role === "recruiter" && result.websiteUrl).toBeUndefined();
  });

  it.each(["javascript:alert(1)", "ftp://acme.com", "no es una url", "https://localhost"])(
    "rechaza el sitio %s",
    (websiteUrl) => {
      expect(onboardingSchema.safeParse({ role: "recruiter", companyName: "Acme", websiteUrl }).success).toBe(false);
    }
  );

  it("rechaza un rol desconocido", () => {
    expect(onboardingSchema.safeParse({ role: "admin", fullName: "Ana" }).success).toBe(false);
  });
});
