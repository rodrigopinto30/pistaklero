import { admin, confirmDialog, signInAsAdmin, emailOf, expect, expectNoA11yViolations, expectToast, MAILPIT_URL, onboardAsCompany, signIn, signInAsReadyCandidate, test, uniqueEmail } from "./support/fixtures";

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

test("el chat ocupa la pantalla, separa los globos, guarda qué hace Enter, se cierra con Escape y no manda con otra cuenta", async ({ page, browser }) => {
  const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const name = `Cleo Chat${run}`;
  const candidate = await (await browser.newContext()).newPage();
  const candidateId = await signInAsReadyCandidate(candidate, name);
  const domain = `chat-${run}.com`;
  const recruiterId = await signIn(page, uniqueEmail("rrhh", domain));
  await onboardAsCompany(page, `Chat ${run}`, domain, "Rita Chat");

  // Una conversación ya aceptada, con un mensaje de la candidata.
  const pairKey = [candidateId, recruiterId].sort().join(":");
  const { data: conversation } = await admin.from("conversations").insert({ pair_key: pairKey, started_by: candidateId }).select("id").single();
  await admin.from("conversation_members").insert([
    { conversation_id: conversation!.id, user_id: candidateId, state: "accepted" },
    { conversation_id: conversation!.id, user_id: recruiterId, state: "accepted" },
  ]);
  await admin.from("messages").insert({ conversation_id: conversation!.id, sender_id: candidateId, body: `Hola, ¿cómo va? ${run}` });

  await page.goto(`/es/mensajes/${conversation!.id}`);
  const log = page.getByRole("log", { name: `Mensajes con ${name}` });
  const box = page.getByRole("textbox", { name: "Escribí un mensaje" });
  const send = page.getByRole("button", { name: "Enviar", exact: true });
  await expect(log.getByText(`Hola, ¿cómo va? ${run}`)).toBeVisible();

  // Ocupa justo la pantalla: sin scroll de la página y sin pie.
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true);
  await expect(page.getByRole("contentinfo")).toBeHidden();

  // Sin texto no hay nada que enviar.
  await expect(send).toHaveAttribute("aria-disabled", "true");
  await box.fill("Todo bien, ¿y vos?");
  await expect(send).not.toHaveAttribute("aria-disabled");
  await box.press("Enter");
  await expect(log.getByText("Todo bien, ¿y vos?")).toBeVisible();
  await expect(send).toHaveAttribute("aria-disabled", "true");

  // Los propios a la derecha y los de la otra persona a la izquierda; cada uno dice de quién es.
  const mine = log.getByRole("listitem").filter({ hasText: "Todo bien, ¿y vos?" });
  const theirs = log.getByRole("listitem").filter({ hasText: `Hola, ¿cómo va? ${run}` });
  await expect(mine).toContainText("Vos:");
  await expect(theirs).toContainText(`${name}:`);
  const [mineBox, theirsBox] = [await mine.boundingBox(), await theirs.boundingBox()];
  expect(mineBox!.x + mineBox!.width).toBeGreaterThan(theirsBox!.x + theirsBox!.width + 20);
  expect(theirsBox!.x).toBeLessThan(mineBox!.x);
  await expectNoA11yViolations(page);

  // Tildes, como en las mensajerías: entregado cuando la otra persona abre Pistaklero y leído cuando
  // abre la conversación (se ponen al día solas). El último mensaje lo dice también escrito.
  const ticks = mine.locator("[data-status]");
  await candidate.goto("/es");
  await expect(ticks).toHaveAttribute("data-status", /delivered|read/, { timeout: 15_000 });
  await candidate.goto(`/es/mensajes/${conversation!.id}`);
  await expect(ticks).toHaveAttribute("data-status", "read", { timeout: 15_000 });
  await expect(mine).toContainText("Leído");

  // La flechita de "Enviar": Enter pasa al siguiente renglón y Ctrl+Enter envía. Queda guardado.
  await page.getByRole("button", { name: "Opciones de envío" }).click();
  await page.getByRole("menuitemradio", { name: /Pasar al siguiente renglón/ }).click();
  await box.fill("línea uno");
  await box.press("Enter");
  await box.pressSequentially("línea dos");
  await expect(box).toHaveValue("línea uno\nlínea dos");
  await expect(page.getByText("Enter, nuevo renglón; Ctrl+Enter envía.")).toBeVisible();
  await box.press("Control+Enter");
  await expect(log.getByText(/línea uno\s+línea dos/)).toBeVisible();
  await page.goto(page.url());
  await page.getByRole("button", { name: "Opciones de envío" }).click();
  await expect(page.getByRole("menuitemradio", { name: /Pasar al siguiente renglón/ })).toHaveAttribute("aria-checked", "true");
  // Escape cierra el menú, no la conversación.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`/es/mensajes/${conversation!.id}$`));

  // El título "Mensajes" es el mismo en la conversación y en la bandeja: al cerrar no se mueve nada.
  await expect(page.getByRole("heading", { level: 1, name: /^Mensajes/ })).toBeVisible();
  const listInChat = (await page.getByRole("list", { name: "Conversaciones" }).boundingBox())!;

  // Escape cierra la conversación; lo escrito queda como borrador.
  await box.fill("un borrador");
  await box.press("Escape");
  await page.waitForURL(/\/es\/mensajes$/);
  await expect(page.getByRole("log")).toHaveCount(0);
  expect((await page.getByRole("list", { name: "Conversaciones" }).boundingBox())!.y).toBe(listInChat.y);
  await page.getByRole("list", { name: "Conversaciones" }).getByRole("link").filter({ hasText: name }).click();
  await expect(page.getByRole("textbox", { name: "Escribí un mensaje" })).toHaveValue("un borrador");

  // Si en otra pestaña (mismo navegador) se entra con otra cuenta, esta avisa y no manda nada.
  const otherTab = await page.context().newPage();
  await signIn(otherTab, uniqueEmail("otra-cuenta"));
  await expect(page.getByRole("alert").filter({ hasText: "Entraste con otra cuenta en otra pestaña" })).toBeVisible();
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page.getByText("No se envió: en otra pestaña entraste con otra cuenta.")).toBeVisible();
  await otherTab.close();
});
