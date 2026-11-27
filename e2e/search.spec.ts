import { expect, expectNoA11yViolations, seedCompanyWithJobs, test } from "./support/fixtures";

const token = () => `zq${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

test("buscar y filtrar ofertas desde el inicio", async ({ page }) => {
  const word = token();
  await seedCompanyWithJobs("Buscadora SA", [
    { title: `${word} Frontend React`, work_mode: "remote", seniority: "junior", salary_currency: "USD" },
    { title: `${word} Backend Go`, work_mode: "onsite", seniority: "senior", salary_currency: "ARS", country: "AR" },
    { title: `${word} Diseño UX`, work_mode: "hybrid", seniority: "trainee", salary_currency: "USD", language: "es" },
  ]);

  await page.goto("/es");
  await page.getByRole("searchbox", { name: "Puesto, empresa o tecnología" }).fill(word);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`q=${word}`));
  await expect(page.getByRole("status").filter({ hasText: "3 empleos" })).toBeVisible();
  await expectNoA11yViolations(page);

  // Filtro rápido: Remoto
  await page.getByText("Remoto", { exact: true }).filter({ visible: true }).first().click();
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "1 empleo" })).toBeVisible();
  await expect(page.getByRole("heading", { name: `${word} Frontend React` })).toBeVisible();

  // Filtro rápido: Trainee / Junior + Pago en USD (sin Remoto)
  await page.goto(`/es?q=${word}&junior=1&usd=1`);
  await expect(page.getByRole("status").filter({ hasText: "2 empleos" })).toBeVisible();

  // Filtro avanzado: presencial
  await page.goto(`/es?q=${word}&mode=onsite`);
  await expect(page.getByRole("heading", { name: `${word} Backend Go` })).toBeVisible();
  await expect(page.locator("details[open]")).toHaveCount(1);

  // La tarjeta lleva al detalle
  await page.getByRole("link", { name: `${word} Backend Go` }).click();
  await expect(page.getByRole("heading", { level: 1, name: `${word} Backend Go` })).toBeVisible();
});

test("la búsqueda funciona sin JavaScript y en inglés", async ({ browser }) => {
  const word = token();
  await seedCompanyWithJobs("Sin JS SA", [{ title: `${word} Data Analyst`, language: "en" }]);

  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/en");
  await page.getByRole("searchbox", { name: "Role, company or technology" }).fill(word);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("1 job");
  await expect(page.getByRole("heading", { name: `${word} Data Analyst` })).toBeVisible();
});

test("cargar más resultados", async ({ page }) => {
  const word = token();
  await seedCompanyWithJobs(
    "Muchas Ofertas SA",
    Array.from({ length: 22 }, (_, i) => ({ title: `${word} Oferta ${i + 1}` }))
  );

  await page.goto(`/es?q=${word}`);
  await expect(page.getByRole("status")).toHaveText("22 empleos");
  await expect(page.getByRole("article")).toHaveCount(20);
  await page.getByRole("link", { name: "Cargar más" }).click();
  await expect(page).toHaveURL(/page=2#resultado-21/);
  await expect(page.getByRole("article")).toHaveCount(22);
  await expect(page.getByRole("link", { name: "Cargar más" })).toHaveCount(0);
});

test("encuentra palabras a medio escribir", async ({ page }) => {
  const word = token();
  await seedCompanyWithJobs("Prefijos SA", [{ title: `Desarrollador/a ${word}xyz Junior` }]);

  // Solo el comienzo de cada palabra: "desa" y el token sin sus últimas letras.
  await page.goto(`/es?q=${encodeURIComponent(`desa ${word}`)}`);
  await expect(page.getByRole("status")).toHaveText("1 empleo");
  await expect(page.getByRole("heading", { name: `Desarrollador/a ${word}xyz Junior` })).toBeVisible();
});

test("sin resultados se ofrece ver todo", async ({ page }) => {
  await seedCompanyWithJobs("Sugerencias SA", [{ title: `${token()} Sugerida` }]);
  await page.goto(`/es?q=${token()}`);
  await expect(page.getByText("No encontramos empleos con esa búsqueda.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver todos los empleos" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Otras ofertas que te pueden interesar" })).toBeVisible();
});

test("los chips de filtro muestran el foco al navegar con teclado", async ({ page }) => {
  await page.goto("/es");
  await page.getByRole("searchbox").focus();
  await page.keyboard.press("Tab"); // botón Buscar
  await page.keyboard.press("Tab"); // primer chip
  const chip = page.locator("label").filter({ hasText: "Remoto" }).first();
  const outline = await chip.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).toBe("solid");
  await page.keyboard.press("Space");
  await expect(chip.locator("input")).toBeChecked();
});
