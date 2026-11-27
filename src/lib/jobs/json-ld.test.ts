import { describe, expect, it } from "vitest";
import { jobPostingJsonLd, serializeJsonLd } from "./json-ld";

const job = {
  title: "Frontend Junior",
  description: "React y TypeScript.",
  published_at: "2026-11-20T12:00:00Z",
  valid_through: "2026-12-20T12:00:00Z",
  employment_type: "full_time" as const,
  work_mode: "remote" as const,
  country: null,
  city: null,
  salary_min: 1000,
  salary_max: 1500,
  salary_currency: "USD",
  salary_period: "month" as const,
  slug: "frontend-junior-abc123",
};
const company = { name: "Acme", website_url: "https://acme.com", logoUrl: null };

describe("jobPostingJsonLd", () => {
  it("arma un JobPosting con salario y trabajo remoto", () => {
    const ld = jobPostingJsonLd(job, company, "https://pistaklero.com/es/empleos/x");
    expect(ld["@type"]).toBe("JobPosting");
    expect(ld.employmentType).toBe("FULL_TIME");
    expect(ld).toMatchObject({ jobLocationType: "TELECOMMUTE", baseSalary: { currency: "USD", value: { minValue: 1000, unitText: "MONTH" } } });
  });

  it("usa la dirección si la oferta es presencial", () => {
    const ld = jobPostingJsonLd({ ...job, work_mode: "onsite", country: "AR", city: "Córdoba" }, company, "https://x");
    expect(ld).toMatchObject({ jobLocation: { address: { addressCountry: "AR", addressLocality: "Córdoba" } } });
  });

  it("no deja cerrar la etiqueta script", () => {
    const serialized = serializeJsonLd(jobPostingJsonLd({ ...job, title: "</script><script>alert(1)</script>" }, company, "https://x"));
    expect(serialized).not.toContain("</script>");
    expect(JSON.parse(serialized).title).toBe("</script><script>alert(1)</script>");
  });
});
