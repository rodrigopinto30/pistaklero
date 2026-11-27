import { expect, expectNoA11yViolations, expectToast, onboardAsCandidate, PNG, signIn, test, uniqueEmail } from "./support/fixtures";

test("el alta de la candidata es un solo formulario con 'Finalizar registro'", async ({ page }) => {
  await signIn(page, uniqueEmail("alta-candidata"));
  await onboardAsCandidate(page, "Cata Completa", { finishSetup: false });

  await expect(page.getByRole("heading", { level: 1, name: "Armá tu perfil" })).toBeVisible();
  const main = page.getByRole("main");
  await expect(main.getByRole("button", { name: /^Guardar/ })).toHaveCount(0);
  await expectNoA11yViolations(page);

  // Foto, datos, habilidades.
  await page.getByRole("region", { name: "Tu foto" }).getByLabel(/^Foto de perfil/).setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: PNG });
  await page.getByRole("region", { name: "Datos básicos" }).getByLabel(/Titular/).fill("Frontend Trainee");
  const skills = page.getByRole("region", { name: "Habilidades" });
  await skills.getByLabel("Habilidad").selectOption({ label: "React" });
  await skills.getByRole("button", { name: "Agregar" }).click();

  // Experiencia: se agregan grupos de campos; uno con la fecha al revés da error y no se pierde nada.
  const experience = page.getByRole("region", { name: "Experiencia" });
  await experience.getByRole("button", { name: "Agregar experiencia" }).click();
  const first = experience.getByRole("group", { name: "Ítem 1" });
  await first.getByLabel(/Puesto/).fill("Pasante");
  await first.getByLabel(/Empresa/).fill("Startup Dos");
  await first.getByLabel(/Inicio/).fill("2025-06");
  await first.getByLabel(/Fin/).fill("2025-01");
  await page.getByRole("region", { name: "Proyectos" }).getByRole("button", { name: "Agregar proyecto" }).click();
  await page.getByRole("region", { name: "Proyectos" }).getByLabel(/Título/).fill("Mi portfolio");

  await main.getByRole("button", { name: "Finalizar registro" }).click();
  await expect(first.getByText("La fecha de fin no puede ser anterior a la de inicio.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Proyectos" }).getByLabel(/Título/)).toHaveValue("Mi portfolio");
  await first.getByLabel(/Fin/).fill("2025-12");
  await main.getByRole("button", { name: "Finalizar registro" }).click();

  // Listo: el perfil pasa a editarse por secciones, con todo lo cargado.
  await expectToast(page, "Tu perfil ya está en Pistaklero");
  await expect(page.getByRole("heading", { level: 1, name: "Mi perfil" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Experiencia" }).getByRole("heading", { name: "Pasante" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Proyectos" }).getByRole("heading", { name: "Mi portfolio" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Habilidades" }).getByRole("listitem").filter({ hasText: "React" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Datos personales" }).locator("img[src*='/avatars/']")).toBeVisible();
});
