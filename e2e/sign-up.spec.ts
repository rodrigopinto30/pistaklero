import { expect, expectNoA11yViolations, fillPersonName, linkFromEmail, test, uniqueEmail } from "./support/fixtures";

test("registro en tres pasos: qué buscás, email y datos personales", async ({ page }) => {
  const email = uniqueEmail("registro");
  await page.goto("/es");
  await page.getByRole("link", { name: "Crear cuenta" }).click();

  // Paso 1: qué buscás
  await expect(page.getByRole("heading", { level: 1, name: "¿Qué venís a buscar?" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Pasos del registro" }).locator("[aria-current=step]")).toHaveText(/Qué buscás/);
  await expectNoA11yViolations(page);
  await page.getByRole("link", { name: /Busco trabajo/ }).click();

  // Paso 2: el email
  await expect(page).toHaveURL(/\/es\/registro\?role=candidate/);
  await expect(page.getByText("Te registrás para: Busco trabajo.")).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Enviarme el link de confirmación" }).click();
  await expect(page.getByText(`Te mandamos un link a ${email}.`, { exact: false })).toBeVisible();

  // Paso 3: el link confirma el email y lleva a los datos, con el rol ya elegido
  await page.goto(await linkFromEmail(email, "token_hash"));
  await expect(page).toHaveURL(/\/es\/bienvenida\?role=candidate/);
  await expect(page.getByRole("heading", { level: 1, name: "Tus datos" })).toBeVisible();
  await expect(page.getByLabel(/Busco trabajo/)).toBeHidden();
  await expectNoA11yViolations(page);
  await fillPersonName(page, "Rita Registro");
  await page.getByLabel(/Titular/).fill("Data Analyst Jr");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.waitForURL("/es/perfil");
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
