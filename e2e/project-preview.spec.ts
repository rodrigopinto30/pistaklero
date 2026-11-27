import { expect, onboardAsCandidate, projectPreviewPath, signIn, test, uniqueEmail } from "./support/fixtures";

// La vista previa real (bajar og:image de internet) se probó a mano. Acá: que nunca se consulte la red interna.

test("un enlace a una IP interna no se acepta", async ({ page }) => {
  await signIn(page, uniqueEmail("ssrf"));
  await onboardAsCandidate(page, "Sara Segura");
  const projects = page.getByRole("region", { name: "Proyectos" });
  await projects.getByText("Agregar proyecto", { exact: true }).first().click();
  await projects.getByLabel(/Título/).fill("Metadata de la nube");
  await projects.getByLabel(/^Enlace/).fill("https://169.254.169.254/latest/meta-data/");
  await projects.getByRole("button", { name: "Agregar proyecto" }).click();
  await expect(projects.getByLabel(/^Enlace/)).toHaveAttribute("aria-invalid", "true");
});

test("un dominio que apunta a la red interna se guarda sin vista previa", async ({ page }) => {
  const userId = await signIn(page, uniqueEmail("ssrf"));
  await onboardAsCandidate(page, "Sara Segura");
  const projects = page.getByRole("region", { name: "Proyectos" });
  await projects.getByText("Agregar proyecto", { exact: true }).first().click();
  await projects.getByLabel(/Título/).fill("Panel interno");
  // nip.io resuelve 127.0.0.1.nip.io a 127.0.0.1: el lookup propio lo bloquea antes de conectar.
  await projects.getByLabel(/^Enlace/).fill("https://127.0.0.1.nip.io/");
  await projects.getByRole("button", { name: "Agregar proyecto" }).click();
  await expect(projects.getByRole("heading", { name: "Panel interno" })).toBeVisible();

  // La descarga corre después de responder: se le da tiempo y se verifica que no guardó nada.
  await page.waitForTimeout(2_000);
  expect(await projectPreviewPath(userId, "Panel interno")).toBeNull();
  await expect(projects.locator("img")).toHaveCount(0);
});
