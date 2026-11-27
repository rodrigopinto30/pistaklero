import { describe, expect, it } from "vitest";
import { basicsSchema, entrySchemas, salarySchema } from "./profile";

const basics = { headline: "", bio: "", country: "", city: "", languages: [], githubUrl: "", linkedinUrl: "", websiteUrl: "" };

describe("basicsSchema", () => {
  it("acepta datos mínimos y normaliza los enlaces", () => {
    const result = basicsSchema.parse({ ...basics, country: "AR", languages: ["es", "en"], githubUrl: "github.com/ana" });
    expect(result.country).toBe("AR");
    expect(result.githubUrl).toBe("https://github.com/ana");
    expect(result.linkedinUrl).toBeUndefined();
  });

  it("rechaza un país fuera de la lista", () => {
    expect(basicsSchema.safeParse({ ...basics, country: "ZZ" }).success).toBe(false);
  });
});

describe("entrySchemas", () => {
  it("convierte los meses a fechas", () => {
    const result = entrySchemas.experience.parse({ companyName: "Acme", title: "Dev", startDate: "2024-03", endDate: "2024-09", description: "" });
    expect(result.startDate).toBe("2024-03-01");
    expect(result.endDate).toBe("2024-09-01");
  });

  it("si sigue en curso no guarda fecha de fin", () => {
    const result = entrySchemas.experience.parse({ companyName: "Acme", title: "Dev", startDate: "2024-03", endDate: "2024-09", current: "on", description: "" });
    expect(result.endDate).toBeUndefined();
  });

  it.each([
    [{ endDate: "2023-01" }, "end_before_start"],
    [{ endDate: "" }, "end_required"],
    [{ endDate: "marzo" }, "invalid_month"],
  ])("explica el problema con la fecha de fin %o", (dates, message) => {
    const result = entrySchemas.education.safeParse({ institution: "UBA", degree: "Lic.", startDate: "2024-03", ...dates });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ path: ["endDate"], message });
  });
});

describe("salarySchema", () => {
  it("convierte el monto a número", () => {
    const result = salarySchema.parse({ amount: "1500.5", currency: "USD", period: "month", basis: "gross", salaryVisibility: "private" });
    expect(result.amount).toBe(1500.5);
  });

  it.each(["0", "-10", "abc"])("rechaza el monto %s", (amount) => {
    expect(salarySchema.safeParse({ amount, currency: "USD", period: "month", basis: "gross", salaryVisibility: "private" }).success).toBe(false);
  });
});
