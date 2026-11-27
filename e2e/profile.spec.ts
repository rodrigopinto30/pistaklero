import { expect, expectNoA11yViolations, onboardAsCandidate, onboardAsCompany, signIn, test, uniqueEmail, PNG, SVG } from "./support/fixtures";

test.describe("perfil del candidato", () => {
  test("se edita por secciones y se ve en el perfil público", async ({ page }) => {
    await signIn(page, uniqueEmail("perfil"));
    await onboardAsCandidate(page, "Ana Pérez");
    await expectNoA11yViolations(page);

    // Datos básicos
    const basics = page.getByRole("region", { name: "Datos básicos" });
    await basics.getByLabel(/Titular/).fill("Frontend Junior · React");
    await basics.getByLabel(/Sobre mí/).fill("Me encanta hacer interfaces accesibles.");
    await basics.getByLabel("Español").check();
    await basics.getByRole("button", { name: "Guardar" }).click();
    await expect(basics.getByText("Guardado.")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("region", { name: "Datos básicos" }).getByLabel(/Titular/)).toHaveValue("Frontend Junior · React");

    // Habilidades
    const skills = page.getByRole("region", { name: "Habilidades" });
    await skills.getByLabel("Habilidad", { exact: true }).selectOption({ label: "React" });
    await skills.getByLabel("Nivel", { exact: true }).selectOption({ label: "Avanzado" });
    await skills.getByRole("button", { name: "Agregar habilidad" }).click();
    await expect(skills.getByRole("listitem").filter({ hasText: "React" })).toBeVisible();

    // Experiencia: primero con fechas al revés
    const experience = page.getByRole("region", { name: "Experiencia" });
    await experience.getByText("Agregar experiencia", { exact: true }).first().click();
    await experience.getByLabel(/Puesto/).fill("Pasante de desarrollo");
    await experience.getByLabel(/Empresa/).fill("Startup Uno");
    await experience.getByLabel(/Inicio/).fill("2025-06");
    await experience.getByLabel(/Fin/).fill("2025-01");
    await experience.getByRole("button", { name: "Agregar experiencia" }).click();
    await expect(experience.getByText("Revisá el valor de este campo.")).toBeVisible();
    await expect(experience.getByLabel(/Fin/)).toBeFocused();
    await experience.getByLabel(/Fin/).fill("2025-12");
    await experience.getByRole("button", { name: "Agregar experiencia" }).click();
    await expect(experience.getByRole("heading", { name: "Pasante de desarrollo" })).toBeVisible();

    // Proyecto
    const projects = page.getByRole("region", { name: "Proyectos" });
    await projects.getByText("Agregar proyecto", { exact: true }).first().click();
    await projects.getByLabel(/Título/).fill("Clon accesible de un todo-list");
    await projects.getByLabel(/^Enlace/).fill("ana.dev/todo");
    await projects.getByRole("button", { name: "Agregar proyecto" }).click();
    await expect(projects.getByRole("heading", { name: "Clon accesible de un todo-list" })).toBeVisible();

    // Expectativa salarial (privada)
    const salary = page.getByRole("region", { name: "Expectativa salarial" });
    await salary.getByLabel(/Monto/).fill("1200");
    await salary.getByRole("button", { name: "Guardar" }).click();
    await expect(salary.getByText("Guardado.")).toBeVisible();

    // Perfil público
    await page.getByRole("link", { name: "Ver cómo se ve mi perfil" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Ana Pérez" })).toBeVisible();
    await expect(page.getByText("Frontend Junior · React", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Clon accesible de un todo-list" })).toBeVisible();
    await expect(page.getByText("1200")).toBeHidden();
    await expectNoA11yViolations(page);
  });

  test("la visibilidad y el bloqueo deciden quién ve el perfil", async ({ browser }) => {
    const domain = `bloqueada-${Date.now()}.com`;

    // La empresa que después va a quedar bloqueada
    const companyPage = await (await browser.newContext()).newPage();
    await signIn(companyPage, uniqueEmail("rrhh", domain));
    await onboardAsCompany(companyPage, `Empleador ${Date.now()}`, domain);

    // La candidata
    const page = await (await browser.newContext()).newPage();
    await signIn(page, uniqueEmail("privada"));
    await onboardAsCandidate(page, "Beto Gómez");
    const publicUrl = await page.getByRole("link", { name: "Ver cómo se ve mi perfil" }).getAttribute("href");

    // Por defecto: solo empresas. Un visitante anónimo no lo ve; la empresa sí.
    const anonymous = await (await browser.newContext()).newPage();
    expect((await anonymous.goto(publicUrl!))?.status()).toBe(404);
    expect((await companyPage.goto(publicUrl!))?.status()).toBe(200);

    // Lo hace público: el anónimo ya lo ve.
    const preferences = page.getByRole("region", { name: "Disponibilidad y privacidad" });
    await preferences.getByLabel(/Cualquiera con el enlace/).check();
    await preferences.getByRole("button", { name: "Guardar" }).click();
    await expect(preferences.getByText("Guardado.")).toBeVisible();
    expect((await anonymous.goto(publicUrl!))?.status()).toBe(200);

    // Bloquea a su empleador: la empresa deja de verlo aunque sea público.
    const blocked = page.getByRole("region", { name: "Empresas bloqueadas" });
    await blocked.getByLabel(/Buscar empresa/).fill(domain);
    await blocked.getByRole("button", { name: "Buscar" }).click();
    await blocked.getByRole("button", { name: /^Bloquear/ }).click();
    await expect(blocked.getByRole("button", { name: /^Desbloquear/ })).toBeVisible();
    expect((await companyPage.goto(publicUrl!))?.status()).toBe(404);
  });

  test("la foto de perfil se sube, se ve en público y se puede quitar", async ({ page }) => {
    await signIn(page, uniqueEmail("foto"));
    await onboardAsCandidate(page, "Flor Foto");
    const person = page.getByRole("region", { name: "Datos personales" });

    // Sin foto: se ven las iniciales.
    await expect(person.getByText("FF", { exact: true })).toBeVisible();

    await person.getByLabel("Foto de perfil").setInputFiles({ name: "foto.svg", mimeType: "image/png", buffer: SVG });
    await person.getByRole("button", { name: "Subir foto" }).click();
    await expect(person.getByText("Usá una imagen PNG, JPEG o WebP.")).toBeVisible();
    await person.getByLabel("Foto de perfil").setInputFiles({ name: "grande.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(4_100_000, 1) });
    await person.getByRole("button", { name: "Subir foto" }).click();
    await expect(person.getByText("La foto pesa más de 4 MB. Elegí una más liviana.")).toBeVisible();

    await person.getByLabel("Foto de perfil").setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: PNG });
    await person.getByRole("button", { name: "Subir foto" }).click();
    const photo = person.locator("img[src*='/avatars/']");
    await expect(photo).toBeVisible();
    expect(await photo.getAttribute("src")).toMatch(/\/avatars\/[0-9a-f-]{36}\/[0-9a-f]{32}\.webp$/);

    // El perfil público la muestra.
    const preferences = page.getByRole("region", { name: "Disponibilidad y privacidad" });
    await preferences.getByLabel(/Cualquiera con el enlace/).check();
    await preferences.getByRole("button", { name: "Guardar" }).click();
    await expect(preferences.getByText("Guardado.")).toBeVisible();
    await page.getByRole("link", { name: "Ver cómo se ve mi perfil" }).click();
    await expect(page.locator("img[src*='/avatars/']")).toBeVisible();

    await page.goBack();
    await page.getByRole("region", { name: "Datos personales" }).getByRole("button", { name: "Quitar foto" }).click();
    await expect(page.getByRole("region", { name: "Datos personales" }).locator("img[src*='/avatars/']")).toHaveCount(0);
  });
});
