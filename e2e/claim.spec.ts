import { expect, expectNoA11yViolations, seedUnclaimedCompany, signIn, test, uniqueEmail } from "./support/fixtures";

test("una empresa sin reclamar se reclama al registrarse con un email del dominio", async ({ page, browser }) => {
  const run = Date.now().toString(36);
  const domain = `reclamo-${run}.com`;
  const company = await seedUnclaimedCompany(`Reclamo ${run}`, domain, `Oferta reclamable ${run}`);

  // La página invita a reclamarla
  await page.goto(`/es/empresas/${company.slug}`);
  const unclaimed = page.getByRole("region", { name: "Página sin reclamar · ¿Trabajás acá?" });
  await expect(unclaimed.getByText(`Ingresá con tu email de @${domain}`)).toBeVisible();
  await expect(unclaimed.getByRole("link", { name: "Reclamar esta página" })).toHaveAttribute("href", "/es/ingresar");
  await expectNoA11yViolations(page);

  // Con un email de otro dominio, no
  const other = await browser.newContext().then((c) => c.newPage());
  await signIn(other, uniqueEmail("intrusa"), "/es/bienvenida");
  await other.getByLabel(/Busco talento/).check();
  await other.getByLabel(/Nombre de la empresa/).fill("Reclamo");
  await other.getByLabel(/Sitio web/).fill(domain);
  await other.getByRole("button", { name: "Continuar" }).click();
  await expect(other.getByText("Esa página está sin reclamar.", { exact: false })).toBeVisible();
  await expect(other.getByLabel(/Sitio web/)).toHaveAttribute("aria-invalid", "true");

  // Con un email del dominio, la empresa (y su oferta) pasa a ser suya
  await signIn(page, uniqueEmail("fundadora", domain), "/es/bienvenida");
  await page.getByLabel(/Busco talento/).check();
  await page.getByLabel(/Nombre de la empresa/).fill("Reclamo");
  await page.getByLabel(/Sitio web/).fill(`https://www.${domain}`);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.waitForURL("/es/panel");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(`Reclamo ${run}`);
  await expect(page.getByText(`Oferta reclamable ${run}`)).toBeVisible();

  await page.goto(`/es/empresas/${company.slug}`);
  await expect(page.getByRole("region", { name: "Página sin reclamar · ¿Trabajás acá?" })).toHaveCount(0);
});
