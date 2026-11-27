import { readFile } from "node:fs/promises";
import { emailOf, expect, expectNoA11yViolations, onboardAsCandidate, onboardAsCompany, signIn, test, uniqueEmail, expectToast, openAccountMenu } from "./support/fixtures";

test("las páginas legales están enlazadas desde el pie y existen en los dos idiomas", async ({ page }) => {
  await page.goto("/es");
  const footer = page.getByRole("contentinfo");
  await footer.getByRole("link", { name: "Privacidad" }).click();
  await expect(page).toHaveURL("/es/legal/privacidad");
  await expect(page.getByRole("heading", { level: 1, name: "Política de privacidad" })).toBeVisible();
  await page.getByRole("link", { name: "ENG – English" }).click();
  await expect(page).toHaveURL("/en/legal/privacy");
  await expect(page.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeVisible();
});

test("ajustes: idioma de los emails y descarga de los datos", async ({ page }) => {
  const userId = await signIn(page, uniqueEmail("ajustes"));
  await onboardAsCandidate(page, "Dana Ruiz");
  const menu = await openAccountMenu(page);
  await menu.getByRole("menuitem", { name: "Ajustes" }).click();
  await page.waitForURL("/es/ajustes");
  await expectNoA11yViolations(page);

  // Sin cambios no hay nada que guardar: el botón queda inactivo (y dice por qué).
  const save = page.getByRole("region", { name: "Preferencias" }).getByRole("button", { name: "Guardar" });
  await expect(save).toHaveAttribute("aria-disabled", "true");
  await expect(save).toHaveAttribute("title", "No hay cambios para guardar");
  await page.getByLabel("Idioma de los emails").selectOption("en");
  await expect(save).not.toHaveAttribute("aria-disabled");
  // Volver al valor original también cuenta como "sin cambios".
  await page.getByLabel("Idioma de los emails").selectOption("es");
  await expect(save).toHaveAttribute("aria-disabled", "true");
  await page.getByLabel("Idioma de los emails").selectOption("en");
  await save.click();
  await expectToast(page, "Cambios guardados.");
  // Recién guardado, vuelve a quedar inactivo.
  await expect(save).toHaveAttribute("aria-disabled", "true");
  await page.reload();
  await expect(page.getByLabel("Idioma de los emails")).toHaveValue("en");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Descargar mis datos" }).click();
  const download = await downloadPromise;
  const data = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(data.account.email).toBe(await emailOf(userId));
  expect(data.person).toEqual({ first_name: "Dana", middle_name: "", last_name: "Ruiz" });
  expect(data.profile.locale).toBe("en");
});

test("eliminar la cuenta borra todo", async ({ page }) => {
  const email = uniqueEmail("borrar");
  await signIn(page, email);
  await onboardAsCandidate(page, "Eli Borrada");
  await page.goto("/es/ajustes");

  const danger = page.getByRole("region", { name: "Eliminar mi cuenta" });
  // Sin tildar la confirmación, el botón no hace nada.
  await expect(danger.getByRole("button", { name: "Eliminar mi cuenta para siempre" })).toHaveAttribute("aria-disabled", "true");
  await danger.getByLabel(/Entiendo que se borra todo/).check();
  await danger.getByRole("button", { name: "Eliminar mi cuenta para siempre" }).click();
  await page.waitForURL("/es");
  await expect(page.getByRole("link", { name: "Ingresar" })).toBeVisible();

  // Con el mismo email, la cuenta es nueva: vuelve a la bienvenida
  await signIn(page, email);
  await page.waitForURL("/es/bienvenida");
});

test("nombre, segundo nombre y apellido se guardan por separado", async ({ page }) => {
  // Una empresa los edita en los ajustes.
  await signIn(page, uniqueEmail("nombres"));
  await page.waitForURL("/es/bienvenida");
  await onboardAsCompany(page, "Nombres SA", "", "Rita Reclutadora");
  await page.goto("/es/ajustes");
  const person = page.getByRole("region", { name: "Datos personales" });
  await expect(person.getByLabel(/^Nombre/)).toHaveValue("Rita");
  await expect(person.getByLabel(/^Apellido/)).toHaveValue("Reclutadora");

  await person.getByLabel(/^Apellido/).fill("");
  await person.getByRole("button", { name: "Guardar" }).click();
  await expect(person.getByText("Este campo es obligatorio.")).toBeVisible();
  await expect(person.getByLabel(/^Apellido/)).toBeFocused();

  await person.getByLabel(/^Segundo nombre/).fill("María");
  await person.getByLabel(/^Apellido/).fill("Gómez");
  await person.getByRole("button", { name: "Guardar" }).click();
  await expectToast(page, "Cambios guardados.");
  await page.reload();
  await expect(page.getByRole("region", { name: "Datos personales" }).getByLabel(/^Segundo nombre/)).toHaveValue("María");
});
