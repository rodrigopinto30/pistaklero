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

  // Filtro rápido: Remoto. Los filtros se despliegan desde el buscador y se aplican apenas se tocan.
  await page.getByRole("button", { name: /^Filtros/ }).click();
  await expect(page.getByRole("button", { name: /^Filtros/ })).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("group", { name: "Filtros rápidos" }).getByText("Remoto", { exact: true }).click();
  await expect(page).toHaveURL(/remote=1/);
  await expect(page.getByRole("status").filter({ hasText: "1 empleo" })).toBeVisible();
  await expect(page.getByRole("heading", { name: `${word} Frontend React` })).toBeVisible();
  // El filtro queda a la vista y se saca con un clic.
  await expect(page.getByRole("button", { name: /Filtros 1 filtro activo/ })).toBeVisible();
  await page.getByRole("link", { name: "Quitar el filtro Remoto" }).click();
  await expect(page.getByRole("status").filter({ hasText: "3 empleos" })).toBeVisible();

  // Filtro rápido: Trainee / Junior + Pago en USD (sin Remoto)
  await page.goto(`/es?q=${word}&junior=1&usd=1`);
  await expect(page.getByRole("status").filter({ hasText: "2 empleos" })).toBeVisible();

  // Filtro avanzado: presencial
  await page.goto(`/es?q=${word}&mode=onsite`);
  await expect(page.getByRole("heading", { name: `${word} Backend Go` })).toBeVisible();
  await expect(page.getByRole("link", { name: "Quitar el filtro Presencial" })).toBeVisible();

  // La tarjeta lleva al detalle
  await page.getByRole("link", { name: `${word} Backend Go`, exact: true }).click();
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
  await page.getByRole("button", { name: /^Filtros/ }).click();
  await page.getByRole("button", { name: /^Filtros/ }).focus();
  await page.keyboard.press("Tab"); // botón Buscar
  await page.keyboard.press("Tab"); // primer chip
  const chip = page.locator("label").filter({ hasText: "Remoto" }).first();
  await expect(chip).toHaveCSS("outline-style", "solid");
});

test("al ir a otra página, el buscador se limpia", async ({ page }) => {
  await page.goto("/es?q=desarrollador");
  const box = page.getByRole("searchbox", { name: "Puesto, empresa o tecnología" });
  await expect(box).toHaveValue("desarrollador");
  await page.getByRole("link", { name: "Pistaklero, ir al inicio" }).click();
  await page.waitForURL("/es");
  await expect(box).toHaveValue("");
  // En otra sección busca ahí: empresas.
  await page.getByRole("navigation", { name: "Secciones" }).first().getByRole("link", { name: "Empresas" }).click();
  await expect(page.getByRole("searchbox", { name: "Nombre o rubro de la empresa" })).toHaveValue("");
});

test("los filtros quedan abiertos mientras se usan y se repliegan al tocar afuera, escribir, buscar, Escape o cambiar de pestaña", async ({ page }) => {
  await page.goto("/es");
  const toggle = page.getByRole("button", { name: /^Filtros/ });
  const box = page.getByRole("searchbox", { name: "Puesto, empresa o tecnología" });

  // Tocar un filtro lo aplica y el panel sigue abierto.
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("group", { name: "Filtros rápidos" }).getByText("Remoto", { exact: true }).click();
  await expect(page).toHaveURL(/remote=1/);
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("search").getByLabel("País").selectOption({ index: 1 });
  await expect(page).toHaveURL(/country=/);
  await expect(toggle).toHaveAttribute("aria-expanded", "true");

  // Un clic afuera lo repliega.
  await page.getByRole("main").click({ position: { x: 5, y: 5 } });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  // Hacer clic en el buscador es tocar afuera; y escribir en él (llegando con el teclado), también.
  await toggle.click();
  await box.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await box.focus();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await box.pressSequentially("rea");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  // Buscar con el botón, también.
  await toggle.click();
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  // Con el teclado se llega a los filtros pasando por "Buscar"; Escape los cierra y el foco vuelve al botón.
  await toggle.click();
  await toggle.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();

  // Cambiar de pestaña lo repliega; al volver a Empleos sigue cerrado.
  await toggle.click();
  await page.getByRole("navigation", { name: "Secciones" }).first().getByRole("link", { name: "Empresas" }).click();
  await page.waitForURL(/\/es\/empresas/);
  await page.getByRole("navigation", { name: "Secciones" }).first().getByRole("link", { name: "Empleos" }).click();
  await page.waitForURL(/\/es(\?|$)/);
  await expect(page.getByRole("button", { name: /^Filtros/ })).toHaveAttribute("aria-expanded", "false");
});
