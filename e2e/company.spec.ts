import { expect, expectNoA11yViolations, onboardAsCandidate, onboardAsCompany, signIn, test, uniqueEmail, PNG, SVG, expectToast, seedCompanyWithJobs, jobSlug } from "./support/fixtures";

// PNG de 1×1 px: alcanza para probar la subida y la recodificación.

test("una empresa arma su página y se ve en público", async ({ page }) => {
  const domain = `cohetes-${Date.now()}.com`;
  await signIn(page, uniqueEmail("rrhh", domain));
  await onboardAsCompany(page, "Cohetes SA", domain);

  // Panel: verificada porque el email es del dominio
  await expect(page.getByRole("heading", { level: 1, name: "Panel de Cohetes SA" })).toBeVisible();
  await expect(page.getByText("Verificada", { exact: true })).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByRole("link", { name: "Editar la página de la empresa" }).click();
  await page.waitForURL("/es/panel/empresa");
  await expectNoA11yViolations(page);

  // Datos
  const details = page.getByRole("region", { name: "Datos de la empresa" });
  await details.getByRole("textbox", { name: /Quiénes somos/ }).click();
  await page.keyboard.type("Hacemos ");
  await page.keyboard.press("Control+b");
  await page.keyboard.type("cohetes reutilizables");
  await page.keyboard.press("Control+b");
  await page.keyboard.type(" desde Córdoba.");
  await details.getByLabel(/^Etapa/).selectOption("seed");
  await details.getByLabel(/^Tamaño/).selectOption("11-50");
  await details.getByRole("button", { name: "Guardar" }).click();
  await expectToast(page, "Cambios guardados.");

  // Cambiar el dominio desverifica; volver lo verifica de nuevo
  const website = page.getByRole("region", { name: "Sitio web y verificación" });
  await website.getByLabel(/^Sitio web/).fill(`otro-${domain}`);
  await website.getByRole("button", { name: "Guardar" }).click();
  await expect(website.getByText("Sin verificar.", { exact: false })).toBeVisible();
  await website.getByLabel(/^Sitio web/).fill(domain);
  await website.getByRole("button", { name: "Guardar" }).click();
  await expect(website.getByText(`Verificada: tu email pertenece al dominio ${domain}.`)).toBeVisible();

  // Logo: SVG rechazado, archivo grande rechazado, PNG aceptado
  const logo = page.getByRole("region", { name: "Logo" });
  // Sin imagen elegida no hay nada que guardar.
  await expect(logo.getByRole("button", { name: "Guardar logo" })).toHaveAttribute("aria-disabled", "true");
  await logo.getByLabel(/^Logo/).setInputFiles({ name: "logo.svg", mimeType: "image/png", buffer: SVG });
  await expect(logo.getByRole("img", { name: "Vista previa de la imagen elegida" })).toBeVisible();
  await logo.getByRole("button", { name: "Guardar logo" }).click();
  await expect(logo.getByText("Usá una imagen PNG, JPEG o WebP.")).toBeVisible();
  // El archivo grande se rechaza al elegirlo, antes de mandarlo.
  await logo.getByLabel(/^Logo/).setInputFiles({ name: "grande.png", mimeType: "image/png", buffer: Buffer.alloc(950_000, 1) });
  await expect(logo.getByText("La imagen pesa más de 900 KB. Elegí una más liviana.")).toBeVisible();
  await logo.getByLabel(/^Logo/).setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
  await logo.getByRole("button", { name: "Guardar logo" }).click();
  await expectToast(page, "Logo actualizado.");
  await expect(logo.getByRole("img", { name: "Imagen actual" })).toBeVisible();
  const logoSrc = await logo.getByRole("img", { name: "Imagen actual" }).getAttribute("src");
  expect(logoSrc).toMatch(/\/company-logos\/[0-9a-f-]{36}\/[0-9a-f]{32}\.webp$/);

  // Stack
  const stack = page.getByRole("region", { name: "Stack tecnológico" });
  await stack.getByLabel("Tecnología").selectOption({ label: "TypeScript" });
  await stack.getByRole("button", { name: "Agregar" }).click();
  await expect(stack.getByRole("button", { name: "Quitar TypeScript" })).toBeVisible();

  // Página pública
  await page.getByRole("link", { name: "Ver página pública" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Cohetes SA" })).toBeVisible();
  await expect(page.getByText("Empresa verificada").filter({ visible: true })).toBeVisible();
  // getByRole ignora la página anterior que Next deja montada y oculta (React Activity).
  const about = page.getByRole("region", { name: "Quiénes somos" });
  await expect(about).toContainText("Hacemos cohetes reutilizables desde Córdoba.");
  await expect(about.locator("strong")).toHaveText("cohetes reutilizables");
  await expect(page.getByText("Seed", { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "TypeScript" })).toBeVisible();
  await expectNoA11yViolations(page);

  // Pestaña de empleos abiertos (todavía ninguno).
  await page.getByRole("navigation", { name: "Secciones de la empresa" }).getByRole("link", { name: /Empleos abiertos/ }).click();
  await expect(page).toHaveURL(/tab=jobs/);
  await expect(page.getByText("No hay ofertas abiertas en este momento.")).toBeVisible();

  // Portada: se sube desde el panel y se ve en la página.
  await page.goto("/es/panel/empresa");
  const cover = page.getByRole("region", { name: "Portada" });
  await cover.getByLabel(/^Portada/).setInputFiles({ name: "portada.png", mimeType: "image/png", buffer: PNG });
  await cover.getByRole("button", { name: "Guardar portada" }).click();
  await expectToast(page, "Portada actualizada.");
  await page.getByRole("link", { name: "Ver página pública" }).click();
  await expect(page.locator("header img[src*='/company-covers/']")).toBeVisible();
});

test("la página de una empresa lista sus empleos abiertos", async ({ page }) => {
  const title = `Empleo de página ${Date.now().toString(36)}`;
  await seedCompanyWithJobs("Con Empleos SA", [{ title }]);
  const slug = await jobSlug(title);
  await page.goto(`/es/empleos/${slug}`);
  await page.getByRole("link", { name: "Con Empleos SA" }).first().click();
  await page.getByRole("link", { name: /Empleos abiertos/ }).click();
  await expect(page.getByRole("article").filter({ hasText: title })).toBeVisible();
  await expectNoA11yViolations(page);
});

test("una candidata no entra al panel de empresas", async ({ page }) => {
  await signIn(page, uniqueEmail("curiosa"));
  await onboardAsCandidate(page);
  await page.goto("/es/panel/empresa");
  await expect(page).toHaveURL("/es");
});
