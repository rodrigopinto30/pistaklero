import { codeFromEmail, expect, expectNoA11yViolations, fillNewPassword, fillPersonName, test, uniqueEmail } from "./support/fixtures";

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
  await page.getByRole("textbox", { name: "Email" }).fill(email);

  // La lista de reglas se tilda mientras se escribe.
  const rules = page.getByRole("list", { name: "La contraseña necesita" });
  await page.getByRole("textbox", { name: "Contraseña", exact: true }).fill("sin-mayuscula-1");
  await expect(rules.getByRole("listitem").filter({ hasText: "Una minúscula" })).toContainText("cumplido");
  await expect(rules.getByRole("listitem").filter({ hasText: "Una mayúscula" })).toContainText("falta");
  await page.getByRole("textbox", { name: "Repetir contraseña" }).fill("sin-mayuscula-1");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByText("Agregale al menos una mayúscula (A-Z).")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Contraseña", exact: true })).toBeFocused();
  // React vacía las contraseñas después de cada respuesta; el email queda.
  await expect(page.getByRole("textbox", { name: "Contraseña", exact: true })).toHaveValue("");
  await expect(page.getByRole("textbox", { name: "Email" })).toHaveValue(email);

  // Repetida distinta: se avisa en el campo de la repetición.
  await fillNewPassword(page, "Mi-Primera-Frase-1", "Mi-Primera-Frase-2");
  await expect(page.getByText("Todavía no coinciden")).toBeVisible();
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByText("Las contraseñas no coinciden.")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Repetir contraseña" })).toBeFocused();
  await expect(page.getByRole("textbox", { name: "Contraseña", exact: true })).toHaveValue("");

  const created = new Date(Date.now() - 1000);
  await fillNewPassword(page, "Mi-Primera-Frase-1");
  await expect(page.getByText("Coinciden", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  // El código de 6 dígitos confirma el email, en la misma pantalla
  await expect(page.getByRole("heading", { name: "Revisá tu email" })).toBeFocused();
  await expect(page.getByText(`Te mandamos un código de 6 dígitos a ${email}.`)).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByLabel("Código de 6 dígitos").fill("123456");
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByText("El código no es correcto o ya venció")).toBeVisible();
  await expect(page.getByLabel("Código de 6 dígitos")).toHaveValue("");
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
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await fillNewPassword(page, "Frase-Para-Despues-1");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Revisá tu email" })).toBeVisible();

  // Se va sin confirmar y vuelve otro día por el ingreso.
  const later = new Date(Date.now() - 1000);
  await page.goto("/es/ingresar");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Contraseña", exact: true }).fill("Frase-Para-Despues-1");
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

test("si llegó invitada a un equipo, crear la cuenta vuelve a la invitación", async ({ page }) => {
  const email = uniqueEmail("invitada");
  await page.goto(`/es/ingresar?${new URLSearchParams({ next: "/api/team/accept?token=inventado" })}`);
  await page.getByRole("link", { name: "Creá tu cuenta" }).click();
  await page.getByRole("link", { name: /Busco talento/ }).click();
  await expect(page).toHaveURL(/\/es\/registro\?role=recruiter&next=%2Fapi%2Fteam%2Faccept/);

  const created = new Date(Date.now() - 1000);
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await fillNewPassword(page, "Frase-De-La-Invitada-1");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.getByLabel("Código de 6 dígitos").fill(await codeFromEmail(email, /confirmar el email/, created));
  await page.getByRole("button", { name: "Confirmar" }).click();
  // Vuelve a aceptar la invitación (acá, inventada: la página lo explica) y no a la bienvenida.
  await expect(page).toHaveURL(/\/es\/invitacion\?error=invalid_invitation/);
});
