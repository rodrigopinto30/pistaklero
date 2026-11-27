import { expect, expectNoA11yViolations, expectToast, onboardAsCompany, PNG, signIn, test, uniqueEmail } from "./support/fixtures";

test("el alta de la empresa es un solo formulario con 'Finalizar registro'", async ({ page }) => {
  const domain = `alta-${Date.now()}${Math.random().toString(36).slice(2, 6)}.com`;
  await signIn(page, uniqueEmail("rrhh", domain));
  await onboardAsCompany(page, "Alta Única SA", domain, "Rita Reclutadora", { finishSetup: false });

  // Recién creada: un solo botón para terminar, sin "Guardar" por sección.
  await expect(page.getByRole("heading", { level: 1, name: "Armá la página de tu empresa" })).toBeVisible();
  const main = page.getByRole("main");
  await expect(main.getByRole("button", { name: "Finalizar registro" })).toBeVisible();
  await expect(main.getByRole("button", { name: /^Guardar/ })).toHaveCount(0);
  await expectNoA11yViolations(page);

  // Logo: se ve apenas se elige; "Quitar" lo descarta y se puede elegir otro.
  const images = page.getByRole("region", { name: "Logo y portada" });
  await images.getByLabel(/^Logo/).setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
  await expect(images.getByRole("img", { name: "Vista previa de la imagen elegida" })).toHaveCount(1);
  await images.getByRole("button", { name: "Quitar" }).click();
  await expect(images.getByRole("img")).toHaveCount(0);
  await images.getByLabel(/^Logo/).setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
  await images.getByLabel(/^Portada/).setInputFiles({ name: "portada.png", mimeType: "image/png", buffer: PNG });
  await expect(images.getByRole("img", { name: "Vista previa de la imagen elegida" })).toHaveCount(2);

  // Industria: lista con las más comunes y "Otra…" para escribirla.
  const details = page.getByRole("region", { name: "Datos de la empresa" });
  await details.getByLabel(/Quiénes somos/).fill("Armamos todo de una sola vez.");
  await details.getByLabel("Industria").selectOption({ label: "Otra…" });
  await details.getByLabel(/¿Cuál\?/).fill("Robótica submarina");

  // Stack opcional, como chips.
  const stack = page.getByRole("region", { name: "Stack tecnológico (opcional)" });
  await stack.getByLabel("Tecnología").selectOption({ label: "TypeScript" });
  await stack.getByRole("button", { name: "Agregar" }).click();
  await expect(stack.getByRole("button", { name: "Quitar TypeScript" })).toBeVisible();

  // Un error no borra nada de lo elegido (tampoco las imágenes).
  await details.getByLabel(/^Nombre/).fill("A");
  await main.getByRole("button", { name: "Finalizar registro" }).click();
  await expect(details.getByLabel(/^Nombre/)).toBeFocused();
  await expect(images.getByRole("img", { name: "Vista previa de la imagen elegida" })).toHaveCount(2);
  await details.getByLabel(/^Nombre/).fill("Alta Única SA");
  await main.getByRole("button", { name: "Finalizar registro" }).click();

  // Listo: al panel, y la página de la empresa pasa a editarse por secciones.
  await page.waitForURL("/es/panel");
  await expectToast(page, "La página de tu empresa ya está en Pistaklero");
  await page.goto("/es/panel/empresa");
  await expect(page.getByRole("heading", { level: 1, name: "Página de la empresa" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Logo", exact: true }).getByRole("img", { name: "Imagen actual" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Portada" }).getByRole("img", { name: "Imagen actual" })).toBeVisible();
  await expect(page.getByLabel(/¿Cuál\?/)).toHaveValue("Robótica submarina");
  await expect(page.getByRole("region", { name: "Stack tecnológico" }).getByRole("button", { name: "Quitar TypeScript" })).toBeVisible();

  // La página pública muestra la industria escrita a mano.
  await page.getByRole("link", { name: "Ver página pública" }).click();
  await expect(page.getByText("Robótica submarina").first()).toBeVisible();
});
