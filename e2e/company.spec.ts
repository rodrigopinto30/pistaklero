import { expect, expectNoA11yViolations, onboardAsCandidate, onboardAsCompany, signIn, test, uniqueEmail, PNG, SVG } from "./support/fixtures";

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
  await details.getByLabel(/Sobre la empresa/).fill("Hacemos cohetes reutilizables desde Córdoba.");
  await details.getByLabel(/^Etapa/).selectOption("seed");
  await details.getByLabel(/^Tamaño/).selectOption("11-50");
  await details.getByRole("button", { name: "Guardar" }).click();
  await expect(details.getByText("Guardado.")).toBeVisible();

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
  await logo.getByLabel("Imagen").setInputFiles({ name: "logo.svg", mimeType: "image/png", buffer: SVG });
  await logo.getByRole("button", { name: "Subir logo" }).click();
  await expect(logo.getByText("Usá una imagen PNG, JPEG o WebP.")).toBeVisible();
  await logo.getByLabel("Imagen").setInputFiles({ name: "grande.png", mimeType: "image/png", buffer: Buffer.alloc(950_000, 1) });
  await logo.getByRole("button", { name: "Subir logo" }).click();
  await expect(logo.getByText("La imagen pesa más de 900 KB. Elegí una más liviana.")).toBeVisible();
  await logo.getByLabel("Imagen").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
  await logo.getByRole("button", { name: "Subir logo" }).click();
  await expect(logo.getByRole("img", { name: "Logo actual" })).toBeVisible();
  const logoSrc = await logo.getByRole("img", { name: "Logo actual" }).getAttribute("src");
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
  await expect(page.getByRole("region", { name: "Sobre la empresa" })).toContainText("Hacemos cohetes reutilizables desde Córdoba.");
  await expect(page.getByText("Seed", { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "TypeScript" })).toBeVisible();
  await expectNoA11yViolations(page);
});

test("una candidata no entra al panel de empresas", async ({ page }) => {
  await signIn(page, uniqueEmail("curiosa"));
  await onboardAsCandidate(page);
  await page.goto("/es/panel/empresa");
  await expect(page).toHaveURL("/es");
});
