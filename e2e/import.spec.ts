import { expect, expectNoA11yViolations, signIn, signInAsAdmin, test, uniqueEmail } from "./support/fixtures";

test("el admin importa una oferta, se cuentan los clics y la empresa se transfiere", async ({ page, browser, request }) => {
  const run = Date.now().toString(36);
  const domain = `importada-${run}.com`;
  const companyName = `Importada ${run}`;
  const title = `Data Analyst importado ${run}`;

  await signInAsAdmin(page);
  await page.goto("/es/admin");
  await page.getByRole("link", { name: "Importar oferta" }).click();
  await page.waitForURL("/es/admin/importar");
  await expect(page.getByText(/La carga con IA está apagada|Completar los campos/).first()).toBeVisible();
  await expectNoA11yViolations(page);

  const review = page.getByRole("region", { name: "Revisar y publicar" });
  await review.getByLabel(/^Empresa/).fill(companyName);
  await review.getByLabel(/^Sitio de la empresa/).fill(domain);
  await review.getByLabel(/^Enlace a la oferta original/).fill(`https://${domain}/empleos/42`);
  await review.getByLabel(/^Puesto/).fill(title);
  await review.getByLabel(/^Resumen/).fill("Analizar datos de ventas y armar tableros para el equipo comercial.");
  // Salario incompleto: el formulario lo marca
  await review.getByLabel(/^Mínimo/).fill("1000");
  await review.getByRole("button", { name: "Publicar oferta importada" }).click();
  await expect(review.getByText("Este campo es obligatorio.")).toBeVisible();
  await review.getByLabel(/^Mínimo/).fill("");
  await review.getByRole("button", { name: "Publicar oferta importada" }).click();
  await expect(page.getByRole("status").filter({ hasText: "la oferta importada ya está publicada" })).toBeVisible();

  // Aparece en la búsqueda como externa y su botón pasa por la ruta que cuenta clics
  await page.goto(`/es?q=${encodeURIComponent(run)}`);
  const card = page.getByRole("article").filter({ hasText: title });
  await expect(card.getByText("Oferta externa")).toBeVisible();
  await card.getByRole("link", { name: title, exact: true }).click();
  const apply = page.getByRole("link", { name: /Postularme en el sitio original/ });
  const href = await apply.getAttribute("href");
  expect(href).toMatch(/^\/api\/jobs\/[0-9a-f-]{36}\/apply$/);
  const response = await request.get(href!, { maxRedirects: 0 });
  expect(response.status()).toBe(303);
  expect(response.headers()["location"]).toBe(`https://${domain}/empleos/42`);

  // El admin ve el clic y transfiere la empresa a una cuenta nueva
  const owner = await (await browser.newContext()).newPage();
  const ownerEmail = uniqueEmail("duena", domain);
  await signIn(owner, ownerEmail);
  await page.goto("/es/admin");
  const unclaimed = page.getByRole("region", { name: "Empresas sin reclamar" }).getByRole("listitem").filter({ hasText: companyName });
  await expect(unclaimed).toContainText("1 oferta · 1 clic");
  await unclaimed.getByLabel(`Email de quien se hace cargo de ${companyName}`).fill(ownerEmail);
  await unclaimed.getByRole("button", { name: "Transferir" }).click();
  await expect(page.getByRole("region", { name: "Empresas sin reclamar" }).getByText(companyName)).toHaveCount(0);

  await owner.goto("/es/panel");
  await expect(owner.getByRole("heading", { level: 1, name: `Panel de ${companyName}` })).toBeVisible();
  await expect(owner.getByText("Verificada", { exact: true })).toBeVisible();
});
