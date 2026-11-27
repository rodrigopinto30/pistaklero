import { expectNoA11yViolations, onboardAsCandidate, signIn, test, uniqueEmail } from "./support/fixtures";

const PUBLIC_PAGES = ["/es", "/en", "/es/ingresar", "/en/sign-in", "/es/no-existe", "/en/nope"];

for (const path of PUBLIC_PAGES) {
  test(`${path} cumple WCAG 2.2 AA`, async ({ page }) => {
    await page.goto(path);
    await expectNoA11yViolations(page);
  });
}

test("la bienvenida cumple WCAG 2.2 AA, también con errores a la vista", async ({ page }) => {
  await signIn(page, uniqueEmail("a11y"), "/es");
  await page.waitForURL("/es/bienvenida");
  await expectNoA11yViolations(page);

  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByText("Elegí una de las dos opciones.").waitFor();
  await expectNoA11yViolations(page);

  await page.getByLabel(/Busco talento/).check();
  await expectNoA11yViolations(page);
});

test("el encabezado de una sesión iniciada cumple WCAG 2.2 AA", async ({ page }) => {
  await signIn(page, uniqueEmail("a11y-sesion"));
  await onboardAsCandidate(page);
  await expectNoA11yViolations(page);
});

test("el primer Tab lleva al enlace para saltar al contenido", async ({ page }) => {
  await page.goto("/es");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Saltar al contenido" });
  await test.expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await test.expect(page.locator("#main-content")).toBeFocused();
});
