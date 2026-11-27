import { describe, expect, it, vi } from "vitest";
import { fetchBoard } from "./providers";

function fakeFetch(body: unknown, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
}

describe("fetchBoard", () => {
  it("Greenhouse: oferta remota con contenido escapado", async () => {
    const fetchImpl = fakeFetch({
      jobs: [
        {
          id: 6231864004,
          title: "Account Executive, Commercial",
          absolute_url: "https://job-boards.greenhouse.io/vercel/jobs/6231864004",
          language: "en",
          location: { name: "Remote - Germany" },
          offices: [{ name: "Remote - Germany", location: "Berlin, Berlin, Germany" }],
          content: "&lt;p&gt;Vercel is the agentic infrastructure company.&lt;/p&gt;",
        },
        { id: 2, title: "Sin URL" },
      ],
    });
    const result = await fetchBoard("greenhouse", "vercel", fetchImpl);
    expect(fetchImpl).toHaveBeenCalledWith("https://boards-api.greenhouse.io/v1/boards/vercel/jobs?content=true", expect.anything());
    expect(result).toEqual({
      ok: true,
      skipped: 1,
      jobs: [
        {
          externalId: "6231864004",
          title: "Account Executive, Commercial",
          url: "https://job-boards.greenhouse.io/vercel/jobs/6231864004",
          summary: "Vercel is the agentic infrastructure company.",
          language: "en",
          seniority: "semi_senior",
          employmentType: "full_time",
          workMode: "remote",
          country: "DE",
          city: null,
        },
      ],
    });
  });

  it("Lever: híbrida con sueldo y país", async () => {
    const result = await fetchBoard(
      "lever",
      "leverdemo",
      fakeFetch([
        {
          id: "ad208490-4052-4f91-a57e-433f2d1e484b",
          text: "Customer Success Manager",
          hostedUrl: "https://jobs.lever.co/leverdemo/ad208490",
          descriptionPlain: "This is a test job for our team.",
          country: "US",
          workplaceType: "hybrid",
          categories: { commitment: "Regular Full Time (Salary)", location: "Atlanta, Georgia" },
          salaryRange: { min: 85000, max: 175000, currency: "USD", interval: "per-year-salary" },
        },
      ])
    );
    expect(result.ok && result.jobs[0]).toMatchObject({
      workMode: "hybrid",
      country: "US",
      city: "Atlanta",
      salaryMin: 85000,
      salaryMax: 175000,
      salaryCurrency: "USD",
      salaryPeriod: "year",
    });
  });

  it("Ashby: toma el sueldo de la compensación y saltea las no listadas", async () => {
    const result = await fetchBoard(
      "ashby",
      "ashby",
      fakeFetch({
        jobs: [
          {
            id: "7458d4e9",
            title: "Engineering Manager - EU",
            jobUrl: "https://jobs.ashbyhq.com/Ashby/7458d4e9",
            employmentType: "FullTime",
            workplaceType: "Remote",
            isRemote: true,
            isListed: true,
            descriptionPlain: "Hi, I'm the director of engineering.",
            address: { postalAddress: { addressCountry: "European Union", addressLocality: "" } },
            compensation: {
              compensationTiers: [
                {
                  components: [
                    { compensationType: "Bonus", interval: "1 YEAR", currencyCode: "EUR", minValue: null, maxValue: null },
                    { compensationType: "Salary", interval: "1 YEAR", currencyCode: "EUR", minValue: 150000, maxValue: 250000 },
                  ],
                },
              ],
            },
          },
          { id: "oculta", title: "Oculta", jobUrl: "https://jobs.ashbyhq.com/Ashby/oculta", isListed: false },
        ],
      })
    );
    expect(result).toMatchObject({ ok: true, skipped: 1 });
    expect(result.ok && result.jobs[0]).toMatchObject({ workMode: "remote", country: null, salaryMin: 150000, salaryCurrency: "EUR" });
  });

  it("Workable: presencial con país por código", async () => {
    const result = await fetchBoard(
      "workable",
      "careers",
      fakeFetch({
        name: "Workable",
        jobs: [
          {
            shortcode: "DFE5C996FC",
            title: "Regional Marketing Manager, Northern Europe",
            url: "https://apply.workable.com/j/DFE5C996FC",
            employment_type: "Full-time",
            experience: "Mid-Senior level",
            telecommuting: false,
            country: "United Kingdom",
            city: "London",
            locations: [{ countryCode: "GB", city: "London" }],
            description: "<p>Workable is a software company.</p>",
          },
        ],
      })
    );
    expect(result.ok && result.jobs[0]).toMatchObject({ workMode: "onsite", country: "GB", city: "London", seniority: "semi_senior" });
  });

  it("informa los errores sin tirar excepciones", async () => {
    expect(await fetchBoard("lever", "../etc/passwd", fakeFetch([]))).toEqual({ ok: false, code: "invalid_token" });
    expect(await fetchBoard("lever", "nope", fakeFetch({}, 404))).toEqual({ ok: false, code: "not_found" });
    expect(await fetchBoard("lever", "nope", fakeFetch({}, 503))).toEqual({ ok: false, code: "unavailable" });
    expect(await fetchBoard("greenhouse", "x", fakeFetch({ nope: true }))).toEqual({ ok: false, code: "invalid_response" });
    const failing = vi.fn(async () => {
      throw new Error("network");
    });
    expect(await fetchBoard("ashby", "x", failing)).toEqual({ ok: false, code: "unavailable" });
  });

  it("codifica el identificador en la URL", async () => {
    const fetchImpl = fakeFetch({ jobs: [] });
    await fetchBoard("workable", "mi.empresa_1", fetchImpl);
    expect(fetchImpl).toHaveBeenCalledWith("https://apply.workable.com/api/v1/widget/accounts/mi.empresa_1?details=true", expect.anything());
  });
});
