import { describe, expect, it } from "vitest";
import { onboardingSchema } from "./onboarding";

const name = { firstName: "Ana", middleName: "", lastName: "Pérez" };

describe("onboardingSchema", () => {
  it("acepta una candidata con nombre, apellido y titular", () => {
    const result = onboardingSchema.parse({ role: "candidate", firstName: "  Ana ", middleName: " María", lastName: "Pérez ", headline: "Frontend" });
    expect(result).toEqual({ role: "candidate", firstName: "Ana", middleName: "María", lastName: "Pérez", headline: "Frontend" });
  });

  it("exige nombre y apellido para los dos roles", () => {
    expect(onboardingSchema.safeParse({ role: "candidate", ...name, lastName: "", headline: "" }).success).toBe(false);
    expect(onboardingSchema.safeParse({ role: "recruiter", ...name, firstName: "", companyName: "Acme", websiteUrl: "" }).success).toBe(false);
  });

  it.each([
    ["acme.com", "https://acme.com"],
    ["http://acme.com/empleos", "https://acme.com/empleos"],
    ["https://www.acme.com.ar", "https://www.acme.com.ar"],
  ])("normaliza el sitio %s a https", (input, expected) => {
    const result = onboardingSchema.parse({ role: "recruiter", ...name, companyName: "Acme", websiteUrl: input });
    expect(result.role === "recruiter" && result.websiteUrl).toBe(expected);
  });

  it("permite una empresa sin sitio web", () => {
    const result = onboardingSchema.parse({ role: "recruiter", ...name, companyName: "Acme", websiteUrl: "" });
    expect(result.role === "recruiter" && result.websiteUrl).toBeUndefined();
  });

  it.each(["javascript:alert(1)", "ftp://acme.com", "no es una url", "https://localhost"])(
    "rechaza el sitio %s",
    (websiteUrl) => {
      expect(onboardingSchema.safeParse({ role: "recruiter", ...name, companyName: "Acme", websiteUrl }).success).toBe(false);
    }
  );

  it("rechaza un rol desconocido", () => {
    expect(onboardingSchema.safeParse({ role: "admin", ...name }).success).toBe(false);
  });
});
