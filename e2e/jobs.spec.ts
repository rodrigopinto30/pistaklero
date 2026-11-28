import type { Page } from "@playwright/test";
import { expect, expectNoA11yViolations, onboardAsCompany, signIn, test, uniqueEmail } from "./support/fixtures";

async function newCompany(page: Page) {
  const domain = `ofertas-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.com`;
  await signIn(page, uniqueEmail("rrhh", domain));
  await onboardAsCompany(page, "Ofertas SA", domain);
}

async function fillJob(page: Page, title: string, { min = "1000", max = "1500" } = {}) {
  await page.getByRole("main").getByLabel(/^Puesto/).fill(title);
  // El editor visual: el formato se da con atajos (o con la barra), como en cualquier procesador de texto.
  await page.getByRole("textbox", { name: /^Descripción/ }).click();
  await page.keyboard.type("Vas a trabajar con ");
  await page.keyboard.press("Control+b");
  await page.keyboard.type("React");
  await page.keyboard.press("Control+b");
  await page.keyboard.type(" y TypeScript.");
  await page.keyboard.press("Enter");
  await page.keyboard.type("- Remoto");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Equipo chico");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  // Lo que parezca HTML o un enlace peligroso queda como texto.
  await page.keyboard.type("<script>alert('xss')</script> [trampa](javascript:alert(1))");
  await page.getByLabel(/^Mínimo/).fill(min);
  await page.getByLabel(/^Máximo/).fill(max);
}

test("una empresa publica una oferta y se ve en público, con Markdown seguro", async ({ page, browser }) => {
  await newCompany(page);
  // El atajo está siempre a la vista en el encabezado (y también en el panel).
  await expect(page.getByRole("main").getByRole("link", { name: "Publicar empleo" })).toBeVisible();
  await page.getByRole("banner").getByRole("link", { name: "Publicar empleo" }).click();
  await page.waitForURL("/es/panel/ofertas/nueva");
  await expectNoA11yViolations(page);

  // Rango salarial inválido
  await fillJob(page, "Desarrolladora Frontend Junior", { min: "1000", max: "9000" });
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByText("El máximo no puede superar 3 veces el mínimo.")).toBeVisible();
  await expect(page.getByLabel(/^Máximo/)).toBeFocused();
  await expectNoA11yViolations(page);

  // Pregunta filtro y tecnologías
  await page.getByLabel(/^Máximo/).fill("1500");
  const q1 = page.getByRole("group", { name: "Pregunta 1" });
  await q1.getByLabel(/^Tipo/).selectOption("single_choice");
  await q1.getByLabel(/^Enunciado/).fill("¿Qué nivel de inglés tenés?");
  await q1.getByLabel(/^Opciones/).fill("Básico\nIntermedio\nAvanzado");
  await page.getByLabel("React", { exact: true }).check();
  await page.getByLabel("TypeScript", { exact: true }).check();
  await page.getByRole("button", { name: "Publicar" }).click();

  // Vuelve a "Mis ofertas", con la oferta recién creada resaltada como nueva.
  await page.waitForURL(/\/es\/panel\/ofertas\?nueva=[0-9a-f-]{36}$/);
  await expect(page.getByRole("region", { name: /^(Avisos|Notifications)$/ }).getByText("¡Tu oferta ya está publicada!")).toBeVisible();
  const created = page.locator("article[data-highlighted]");
  await expect(created.getByRole("heading", { name: "Desarrolladora Frontend Junior" })).toBeVisible();
  await expect(created.getByText("Nueva", { exact: true })).toBeVisible();
  await expectNoA11yViolations(page);
  await created.getByRole("link", { name: "Desarrolladora Frontend Junior" }).click();
  await expect(page.getByText("Publicada", { exact: true }).filter({ visible: true })).toBeVisible();

  // Detalle público, visto por un visitante anónimo
  const publicHref = await page.getByRole("link", { name: "Ver oferta publicada" }).getAttribute("href");
  const visitor = await (await browser.newContext()).newPage();
  const dialogs: string[] = [];
  visitor.on("dialog", (d) => {
    dialogs.push(d.message());
    void d.dismiss();
  });
  await visitor.goto(publicHref!);
  await expect(visitor.getByRole("heading", { level: 1, name: "Desarrolladora Frontend Junior" })).toBeVisible();
  // En español, Intl no agrupa los miles por debajo de 10.000: "1000", no "1.000".
  await expect(visitor.getByText(/1[.,]?000/).first()).toBeVisible();
  await expect(visitor.getByRole("listitem").filter({ hasText: "Remoto" }).first()).toBeVisible();
  await expect(visitor.locator("article strong").filter({ hasText: "React" })).toBeVisible();
  expect(await visitor.locator("article script").count()).toBe(0);
  const trap = visitor.getByRole("link", { name: "trampa" });
  expect(await trap.count() === 0 || !(await trap.getAttribute("href"))?.startsWith("javascript:")).toBe(true);
  expect(dialogs).toEqual([]);
  await expectNoA11yViolations(visitor);

  // Panel: la oferta aparece en la lista
  await page.goto("/es/panel");
  await expect(page.getByRole("link", { name: "Desarrolladora Frontend Junior" })).toBeVisible();

  // Cerrarla: deja de ser pública
  await page.getByRole("link", { name: "Desarrolladora Frontend Junior" }).click();
  await page.getByRole("button", { name: "Cerrar oferta" }).click();
  await expect(page.getByText("Cerrada", { exact: true }).filter({ visible: true })).toBeVisible();
  expect((await visitor.goto(publicHref!))?.status()).toBe(404);
});

test("un borrador no es público hasta publicarlo", async ({ page, browser }) => {
  await newCompany(page);
  await page.goto("/es/panel/ofertas/nueva");
  await fillJob(page, "Community Manager Trainee");
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await page.waitForURL(/\/es\/panel\/ofertas\?nueva=[0-9a-f-]{36}$/);
  const draft = page.locator("article[data-highlighted]");
  await expect(draft.getByText("Borrador", { exact: true })).toBeVisible();
  await draft.getByRole("link", { name: "Editar" }).click();
  await expect(page.getByRole("link", { name: "Ver oferta publicada" })).toHaveCount(0);

  await page.getByRole("button", { name: "Publicar" }).click();
  await page.waitForURL(/\/es\/panel\/ofertas\?nueva=[0-9a-f-]{36}$/);
  await expect(page.locator("article[data-highlighted]").getByText("Publicada", { exact: true })).toBeVisible();
  await page.locator("article[data-highlighted]").getByRole("link", { name: "Community Manager Trainee" }).click();
  const href = await page.getByRole("link", { name: "Ver oferta publicada" }).getAttribute("href");
  const visitor = await (await browser.newContext()).newPage();
  expect((await visitor.goto(href!))?.status()).toBe(200);
});
