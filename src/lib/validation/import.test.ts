import { describe, expect, it } from "vitest";
import { importedJobSchema } from "./import";

const base = {
  companyName: "Globo SA",
  companyWebsite: "globo.com",
  externalUrl: "https://globo.com/empleos/123",
  title: "Analista de datos",
  summary: "Buscan una persona para analizar datos de ventas y armar reportes semanales.",
  language: "es",
  seniority: "junior",
  employmentType: "full_time",
  workMode: "remote",
  country: "",
  city: "",
  salaryMin: "",
  salaryMax: "",
  salaryCurrency: "",
  salaryPeriod: "",
  salaryBasis: "",
  validDays: "30",
};
const paths = (input: object) => importedJobSchema.safeParse(input).error?.issues.map((i) => i.path.join(".")) ?? [];

describe("importedJobSchema", () => {
  it("acepta una oferta importada sin salario", () => {
    const job = importedJobSchema.parse(base);
    expect(job.salaryMin).toBeUndefined();
    expect(job.companyWebsite).toBe("https://globo.com");
  });

  it("exige el enlace https al original", () => {
    expect(paths({ ...base, externalUrl: "http://globo.com/x" })).toContain("externalUrl");
    expect(paths({ ...base, externalUrl: "" })).toContain("externalUrl");
  });

  it("el salario es todo o nada", () => {
    expect(paths({ ...base, salaryMin: "1000" }).length).toBeGreaterThan(0);
    const full = { ...base, salaryMin: "1000", salaryMax: "1500", salaryCurrency: "USD", salaryPeriod: "month", salaryBasis: "gross" };
    expect(importedJobSchema.parse(full).salaryMax).toBe(1500);
  });
});
