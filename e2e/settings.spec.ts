import { readFile } from "node:fs/promises";
import { emailOf, expect, expectNoA11yViolations, onboardAsCandidate, signIn, test, uniqueEmail } from "./support/fixtures";

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
  await page.getByRole("link", { name: "Ajustes" }).click();
  await page.waitForURL("/es/ajustes");
  await expectNoA11yViolations(page);

  await page.getByLabel("Idioma de los emails").selectOption("en");
  await page.getByRole("region", { name: "Preferencias" }).getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Guardado.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Idioma de los emails")).toHaveValue("en");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Descargar mis datos" }).click();
  const download = await downloadPromise;
  const data = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(data.account.email).toBe(await emailOf(userId));
  expect(data.candidate.full_name).toBe("Dana Ruiz");
  expect(data.profile.locale).toBe("en");
});

test("eliminar la cuenta borra todo", async ({ page }) => {
  const email = uniqueEmail("borrar");
  await signIn(page, email);
  await onboardAsCandidate(page, "Eli Borrada");
  await page.goto("/es/ajustes");

  const danger = page.getByRole("region", { name: "Eliminar mi cuenta" });
  await danger.getByRole("button", { name: "Eliminar mi cuenta para siempre" }).click();
  await expect(danger.getByText("Marcá la casilla para confirmar.")).toBeVisible();
  await danger.getByLabel(/Entiendo que se borra todo/).check();
  await danger.getByRole("button", { name: "Eliminar mi cuenta para siempre" }).click();
  await page.waitForURL("/es");
  await expect(page.getByRole("link", { name: "Ingresar" })).toBeVisible();

  // Con el mismo email, la cuenta es nueva: vuelve a la bienvenida
  await signIn(page, email);
  await page.waitForURL("/es/bienvenida");
});
