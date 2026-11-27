import { describe, expect, it } from "vitest";
import { formatSalaryRange } from "./format";

const job = { salary_min: 1000, salary_max: 1500, salary_currency: "USD", salary_period: "month", salary_basis: "gross" };

describe("formatSalaryRange", () => {
  it("formatea el rango con la moneda y el idioma", () => {
    expect(formatSalaryRange(job, "en")).toBe("$1,000 – $1,500");
    expect(formatSalaryRange(job, "es")).toMatch(/1000.*1500|1\.000.*1\.500/);
  });

  it("un solo valor si mínimo y máximo coinciden", () => {
    expect(formatSalaryRange({ ...job, salary_max: 1000 }, "en")).toBe("$1,000");
  });

  it("null si no informa sueldo", () => {
    expect(formatSalaryRange({ ...job, salary_min: null, salary_max: null, salary_currency: null }, "es")).toBeNull();
  });
});
