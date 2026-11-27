import { expect, jobSlug, seedCompanyWithJobs, test } from "./support/fixtures";

test("robots.txt apunta al sitemap y bloquea las páginas privadas", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /api/");
  expect(robots).toContain("Disallow: /es/panel");
  expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);
});

test("el sitemap y la oferta llevan hreflang y JobPosting", async ({ request }) => {
  const title = `SEO ${Date.now().toString(36)} </script><b>`;
  await seedCompanyWithJobs("Indexable", [{ title }]);
  const slug = await jobSlug(title);

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain(`/es/empleos/${slug}</loc>`);
  expect(sitemap).toContain(`hreflang="en" href="http://127.0.0.1:3000/en/jobs/${slug}"`);

  // HTML del servidor: es lo que leen los buscadores.
  const html = await (await request.get(`/es/empleos/${slug}`)).text();
  expect(html).toContain(`<link rel="canonical" href="http://127.0.0.1:3000/es/empleos/${slug}"/>`);
  expect(html).toContain(`hrefLang="en" href="http://127.0.0.1:3000/en/jobs/${slug}"`);
  const match = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/);
  expect(match).not.toBeNull();
  const ld = JSON.parse(match![1]!);
  expect(ld).toMatchObject({ "@type": "JobPosting", title, hiringOrganization: { name: "Indexable" }, jobLocationType: "TELECOMMUTE" });
  expect(ld.baseSalary.value).toMatchObject({ minValue: 1000, maxValue: 1500, unitText: "MONTH" });
  // El título con "</script>" no rompe la etiqueta: queda escapado.
  expect(match![1]).not.toContain("</script>");
});
