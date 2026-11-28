import { confirmDialog, signInAsAdmin, emailOf, expect, expectNoA11yViolations, expectToast, MAILPIT_URL, onboardAsCompany, signIn, signInAsReadyCandidate, test, uniqueEmail } from "./support/fixtures";

async function lastEmailTo(email: string) {
  let message: { Subject: string; Text: string } | undefined;
  await expect
    .poll(async () => {
      const search = await (await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json();
      const id = search.messages?.[0]?.ID;
      if (!id) return undefined;
      message = await (await fetch(`${MAILPIT_URL}/api/v1/message/${id}`)).json();
      return message?.Subject;
    }, { timeout: 15_000 })
    .toBeTruthy();
  return message!;
}

test("una empresa le escribe a una candidata: solicitud, respuesta, denuncia y bloqueo", async ({ page, browser }) => {
  const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const name = `Mia Mensajes${run}`;

  // La candidata (perfil visible para empresas).
  const candidate = await (await browser.newContext()).newPage();
  const candidateId = await signInAsReadyCandidate(candidate, name);

  // La empresa la encuentra en Talento y le escribe desde la tarjeta.
  const domain = `mensajes-${run}.com`;
  await signIn(page, uniqueEmail("rrhh", domain));
  await onboardAsCompany(page, `Mensajes ${run}`, domain);
  await page.goto(`/es/talento?q=${encodeURIComponent(`Mensajes${run}`)}`);
  await page.getByRole("link", { name: `Enviar un mensaje a ${name}` }).click();
  await page.waitForURL(/\/es\/mensajes\/nuevo\?to=/);
  await expectNoA11yViolations(page);
  await page.getByRole("textbox", { name: "Escribí un mensaje" }).fill("Hola Mia, vimos tu perfil y nos encantaría charlar.");
  await page.getByRole("textbox", { name: "Escribí un mensaje" }).press("Enter");
  await page.waitForURL(/\/es\/mensajes\/[0-9a-f-]{36}$/);
  const recruiterLog = page.getByRole("log", { name: `Mensajes con ${name}` });
  await expect(recruiterLog.getByText("Hola Mia, vimos tu perfil")).toBeVisible();
  // Hasta que acepte, no se puede insistir.
  await expect(page.getByText(`Le mandaste una solicitud a ${name}`)).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Escribí un mensaje" })).toHaveCount(0);

  // A la candidata le llega como solicitud: contador en el encabezado y aviso por email (sin el texto).
  await candidate.goto("/es");
  await expect(candidate.getByRole("link", { name: "Mensajes: 1 sin leer" })).toBeVisible();
  const email = await lastEmailTo(await emailOf(candidateId));
  expect(email.Subject).toContain("quiere escribirte en Pistaklero");
  expect(email.Text).not.toContain("vimos tu perfil");
  await candidate.getByRole("link", { name: "Mensajes: 1 sin leer" }).click();
  await candidate.getByRole("link", { name: /^Solicitudes/ }).click();
  await candidate.getByRole("list", { name: "Conversaciones" }).getByRole("link").first().click();
  await expect(candidate.getByText(/quiere escribirte\. Si respondés, aceptás la conversación\./)).toBeVisible();
  await expectNoA11yViolations(candidate);

  // Responder es aceptar; a la empresa le aparece sola (sin recargar).
  await candidate.getByRole("textbox", { name: "Escribí un mensaje" }).fill("¡Hola! Sí, me interesa.");
  await candidate.getByRole("button", { name: "Enviar" }).click();
  await expect(candidate.getByRole("log").getByText("¡Hola! Sí, me interesa.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Escribí un mensaje" })).toBeVisible();
  await page.getByRole("textbox", { name: "Escribí un mensaje" }).fill(`¡Genial! ¿Te queda bien el jueves? ${run}`);
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(candidate.getByRole("log").getByText(`¿Te queda bien el jueves? ${run}`)).toBeVisible({ timeout: 15_000 });

  // Denunciar un mensaje y bloquear.
  const received = candidate.getByRole("log").getByRole("listitem").filter({ hasText: `¿Te queda bien el jueves? ${run}` });
  await received.getByText("Denunciar", { exact: true }).click();
  await received.getByLabel("Estafa o pedido de dinero").check();
  await received.getByRole("button", { name: "Enviar denuncia" }).click();
  await expect(received.getByText("Gracias: lo vamos a revisar.")).toBeVisible();
  await candidate.getByRole("button", { name: "Bloquear" }).click();
  await confirmDialog(candidate, "Bloquear");
  await expectToast(candidate, "Bloqueaste a esa persona");
  await expect(candidate.getByText("Todavía no tenés conversaciones.")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Esta conversación ya no está disponible.")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Escribí un mensaje" })).toHaveCount(0);

  // El admin ve solo el mensaje denunciado y descarta la denuncia.
  const admin = await (await browser.newContext()).newPage();
  await signInAsAdmin(admin);
  await admin.goto("/es/admin");
  const reports = admin.getByRole("region", { name: "Mensajes denunciados" });
  const report = reports.getByRole("listitem").filter({ hasText: `¿Te queda bien el jueves? ${run}` });
  await expect(report).toContainText("Estafa o pedido de dinero");
  await expect(reports.getByText("Hola Mia, vimos tu perfil")).toHaveCount(0);
  await report.getByRole("button", { name: "Descartar la denuncia" }).click();
  await expect(report).toHaveCount(0);
});
