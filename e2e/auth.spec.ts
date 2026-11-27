import {
  codeFromEmail,
  createUserWithPassword,
  expect,
  expectNoA11yViolations,
  onboardAsCandidate,
  signIn,
  signOutFromMenu,
  test,
  uniqueEmail,
  expectToast,
} from "./support/fixtures";

const PASSWORD = "una frase de prueba larga";

test("ingreso con email y contraseña, y salida", async ({ page }) => {
  const email = uniqueEmail("clave");
  await createUserWithPassword(email, PASSWORD);
  await page.goto("/es/ingresar");
  await expectNoA11yViolations(page);

  // Errores claros y sin revelar si la cuenta existe
  await page.getByRole("textbox", { name: "Email" }).fill("no-es-un-email");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByText("Escribí un email válido")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Email" })).toBeFocused();

  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Contraseña", exact: true }).fill("otra frase cualquiera");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "El email o la contraseña no son correctos." })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Contraseña", exact: true })).toHaveValue("");

  // El botón del ojo muestra lo que se escribió
  const password = page.getByRole("textbox", { name: "Contraseña", exact: true });
  await password.fill(PASSWORD);
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Mostrar contraseña" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(page.getByRole("button", { name: "Mostrar contraseña" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await page.waitForURL("/es/bienvenida");

  const cookies = (await page.context().cookies()).filter((c) => c.name.startsWith("sb-") && !c.name.includes("verifier"));
  expect(cookies.length).toBeGreaterThan(0);
  expect(cookies.every((c) => c.httpOnly), "cookies de sesión HttpOnly").toBe(true);

  await signOutFromMenu(page);
  await expect(page.getByRole("link", { name: "Ingresar" })).toBeVisible();
});

test("después de 5 intentos fallidos, ese email espera 15 minutos", async ({ page }) => {
  const email = uniqueEmail("fuerza-bruta");
  await createUserWithPassword(email, PASSWORD);
  await page.goto("/es/ingresar");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.getByRole("textbox", { name: "Contraseña", exact: true }).fill(`intento equivocado ${attempt}`);
    await page.getByRole("button", { name: "Ingresar", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "no son correctos" })).toBeVisible();
    // Después de cada respuesta React vacía la contraseña: se espera para no escribir antes de tiempo.
    await expect(page.getByRole("textbox", { name: "Contraseña", exact: true })).toHaveValue("");
  }
  // Ni con la contraseña correcta: primero hay que esperar (o recuperarla).
  await page.getByRole("textbox", { name: "Contraseña", exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Esperá 15 minutos" })).toBeVisible();
});

test("recuperar la contraseña con un código, sin links", async ({ page }) => {
  const email = uniqueEmail("olvido");
  await createUserWithPassword(email, PASSWORD);
  await page.goto("/es/ingresar");
  await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();
  await expect(page).toHaveURL("/es/recuperar-contrasena");
  await expectNoA11yViolations(page);

  const asked = new Date(Date.now() - 1000);
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("button", { name: "Enviarme el código" }).click();
  await expect(page.getByRole("heading", { name: "Revisá tu email" })).toBeFocused();
  const code = await codeFromEmail(email, /contraseña nueva/, asked);

  // Una contraseña de las más usadas y un código equivocado: mensajes claros.
  await page.getByLabel("Código de 6 dígitos").fill("000000");
  await page.getByLabel("Contraseña nueva").fill("contraseña123");
  await page.getByRole("button", { name: "Guardar la contraseña" }).click();
  await expect(page.getByText("Esa contraseña es de las más usadas")).toBeVisible();
  await expect(page.getByLabel("Contraseña nueva")).toHaveValue("");
  // El código escrito se conserva: solo hay que corregir la contraseña.
  await expect(page.getByLabel("Código de 6 dígitos")).toHaveValue("000000");
  await page.getByLabel("Contraseña nueva").fill("mi nueva frase secreta");
  await page.getByRole("button", { name: "Guardar la contraseña" }).click();
  await expect(page.getByText("El código no es correcto o ya venció")).toBeVisible();
  await expect(page.getByLabel("Código de 6 dígitos")).toHaveValue("");
  await expectNoA11yViolations(page);

  await page.getByLabel("Código de 6 dígitos").fill(code);
  await page.getByLabel("Contraseña nueva").fill("mi nueva frase secreta");
  await page.getByRole("button", { name: "Guardar la contraseña" }).click();
  await page.waitForURL("/es/bienvenida");
  await expectToast(page, "Listo, ya tenés tu contraseña nueva.");

  // La nueva sirve para ingresar; la vieja ya no.
  await signOutFromMenu(page);
  await page.goto("/es/ingresar");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Contraseña", exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "no son correctos" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Contraseña", exact: true })).toHaveValue("");
  await page.getByRole("textbox", { name: "Contraseña", exact: true }).fill("mi nueva frase secreta");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await page.waitForURL("/es/bienvenida");
});

test("cambiar la contraseña desde Ajustes pide la actual", async ({ page }) => {
  const email = uniqueEmail("cambio");
  await createUserWithPassword(email, PASSWORD);
  await page.goto("/es/ingresar");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Contraseña", exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await page.waitForURL("/es/bienvenida");
  await onboardAsCandidate(page, "Clara Cambio");

  await page.goto("/es/ajustes");
  const section = page.getByRole("region", { name: "Contraseña" });
  await section.getByLabel("Contraseña actual").fill("no es la actual");
  await section.getByLabel("Contraseña nueva").fill("otra frase bien larga");
  await section.getByRole("button", { name: "Cambiar la contraseña" }).click();
  await expect(section.getByText("La contraseña actual no es correcta.")).toBeVisible();
  await expect(section.getByLabel("Contraseña actual")).toBeFocused();
  await expect(section.getByLabel("Contraseña actual")).toHaveValue("");

  await section.getByLabel("Contraseña actual").fill(PASSWORD);
  await section.getByLabel("Contraseña nueva").fill("otra frase bien larga");
  await section.getByRole("button", { name: "Cambiar la contraseña" }).click();
  await expectToast(page, "Cambiaste tu contraseña.");
});

test("un link ya usado o inventado lleva al ingreso con un aviso", async ({ page }) => {
  await page.goto("/api/auth/confirm?token_hash=inventado&next=/es");
  await expect(page).toHaveURL(/\/es\/ingresar\?error=link_expired/);
  await expect(page.getByRole("alert").filter({ hasText: "venció o ya se usó" })).toBeVisible();
});

test("para borrar la cuenta, con sesión vieja se pide la contraseña de nuevo", async ({ page }) => {
  await signIn(page, uniqueEmail("reauth"));
  await page.goto("/es/ingresar?reauth=1&next=/es/ajustes");
  await expect(page.getByRole("heading", { level: 1, name: "Confirmá que sos vos" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Email" })).toHaveAttribute("readonly", "");
  // Sin reauth=1, con sesión no se muestra el ingreso.
  await page.goto("/es/ingresar");
  await expect(page).not.toHaveURL(/ingresar/);
});
