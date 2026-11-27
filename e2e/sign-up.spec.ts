import { codeFromEmail, expect, expectNoA11yViolations, fillPersonName, test, uniqueEmail } from "./support/fixtures";

test("registro en tres pasos: qué buscás, la cuenta (con código) y los datos personales", async ({ page }) => {
  const email = uniqueEmail("registro");
  await page.goto("/es");
  await page.getByRole("link", { name: "Crear cuenta" }).click();

  // Paso 1: qué buscás
  await expect(page.getByRole("heading", { level: 1, name: "¿Qué venís a buscar?" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Pasos del registro" }).locator("[aria-current=step]")).toHaveText(/Qué buscás/);
  await expectNoA11yViolations(page);
  await page.getByRole("link", { name: /Busco trabajo/ }).click();

  // Paso 2: email y contraseña
  await expect(page).toHaveURL(/\/es\/registro\?role=candidate/);
  await expect(page.getByText("Te registrás para: Busco trabajo.")).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill("12345678");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByText("Esa contraseña es de las más usadas")).toBeVisible();
  await expect(page.getByLabel("Contraseña", { exact: true })).toBeFocused();
  await page.getByLabel("Contraseña", { exact: true }).fill("corta");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByText("al menos 8 caracteres.")).toBeVisible();

  const created = new Date(Date.now() - 1000);
  await page.getByLabel("Contraseña", { exact: true }).fill("mi primera frase segura");
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  // El código de 6 dígitos confirma el email, en la misma pantalla
  await expect(page.getByRole("heading", { name: "Revisá tu email" })).toBeFocused();
  await expect(page.getByText(`Te mandamos un código de 6 dígitos a ${email}.`)).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByLabel("Código de 6 dígitos").fill("123456");
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByText("El código no es correcto o ya venció")).toBeVisible();
  await page.getByLabel("Código de 6 dígitos").fill(await codeFromEmail(email, /confirmar el email/, created));
  await page.getByRole("button", { name: "Confirmar" }).click();

  // Paso 3: los datos personales, con el rol ya elegido
  await expect(page).toHaveURL(/\/es\/bienvenida\?role=candidate/);
  await expect(page.getByRole("heading", { level: 1, name: "Tus datos" })).toBeVisible();
  await expect(page.getByLabel(/Busco trabajo/)).toBeHidden();
  await expectNoA11yViolations(page);
  await fillPersonName(page, "Rita Registro");
  await page.getByLabel(/Titular/).fill("Data Analyst Jr");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.waitForURL("/es/perfil");
});

test("si no confirmó el email, al ingresar se le pide el código", async ({ page }) => {
  const email = uniqueEmail("sin-confirmar");
  await page.goto("/es/registro?role=recruiter");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill("frase para después");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Revisá tu email" })).toBeVisible();

  // Se va sin confirmar y vuelve otro día por el ingreso.
  const later = new Date(Date.now() - 1000);
  await page.goto("/es/ingresar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill("frase para después");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Revisá tu email" })).toBeVisible();
  await page.getByLabel("Código de 6 dígitos").fill(await codeFromEmail(email, /confirmar el email/, later));
  await page.getByRole("button", { name: "Confirmar" }).click();
  await page.waitForURL("/es/bienvenida");
});

test("en el registro se puede volver y cambiar lo que buscás", async ({ page }) => {
  await page.goto("/es/registro?role=recruiter");
  await expect(page.getByText("Te registrás para: Busco talento.")).toBeVisible();
  await page.getByRole("link", { name: "Cambiar" }).click();
  await expect(page).toHaveURL("/es/registro");
  await page.getByRole("link", { name: /Ya tenés cuenta|Ingresá/ }).last().click();
  await expect(page).toHaveURL("/es/ingresar");
  await page.getByRole("link", { name: "Creá tu cuenta" }).click();
  await expect(page).toHaveURL("/es/registro");
});
