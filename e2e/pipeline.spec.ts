import { admin, emailOf, expect, expectNoA11yViolations, MAILPIT_URL, onboardAsCompany, publishJobFor, signIn, signInAsReadyCandidate, test, uniqueEmail } from "./support/fixtures";

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

test("la empresa gestiona a quien se postuló y la candidata se entera de todo", async ({ browser }) => {
  const companyName = `Pipeline ${Date.now()}`;
  const domain = `pipeline-${Date.now()}${Math.random().toString(36).slice(2, 6)}.com`;
  const recruiter = await (await browser.newContext()).newPage();
  await signIn(recruiter, uniqueEmail("rrhh", domain));
  await onboardAsCompany(recruiter, companyName, domain);
  const title = `Analista ${Date.now().toString(36)}`;
  const job = await publishJobFor(companyName, title);

  // La candidata se postula
  const candidate = await (await browser.newContext()).newPage();
  const candidateId = await signInAsReadyCandidate(candidate, "Carla Díaz");
  const candidateEmail = await emailOf(candidateId);
  await candidate.goto(`/es/empleos/${job.slug}`);
  await candidate.getByRole("button", { name: "Postularme rápidamente" }).click();
  await expect(candidate.getByRole("status").filter({ hasText: "Tu postulación fue enviada" })).toBeVisible();

  // La empresa la ve en "Nuevas"
  await recruiter.goto("/es/panel/ofertas");
  const row = recruiter.getByRole("article").filter({ has: recruiter.getByRole("heading", { name: title }) });
  await expect(row.getByText("1 postulación", { exact: true })).toBeVisible();
  await expect(row.getByText("1 sin revisar", { exact: true })).toBeVisible();
  await row.getByRole("link", { name: "Postulantes" }).click();
  await recruiter.waitForURL(`/es/panel/ofertas/${job.id}/postulantes`);
  await expect(recruiter.getByRole("link", { name: "Nuevas 1" })).toHaveAttribute("aria-current", "page");
  await expect(recruiter.getByRole("heading", { name: "Carla Díaz" })).toBeVisible();
  await expectNoA11yViolations(recruiter);

  // Con su tarjeta a la vista, la postulación pasa sola a "Vista" y la candidata se entera.
  await expect
    .poll(async () => (await admin.from("applications").select("status").eq("job_id", job.id).single()).data?.status, { timeout: 15_000 })
    .toBe("viewed");
  await candidate.goto("/es/mis-postulaciones");
  const journey = candidate.getByRole("listitem").filter({ hasText: title }).getByRole("list", { name: "Recorrido de la postulación" });
  await expect(journey.locator('[aria-current="step"]')).toContainText("Vista");
  await expect(journey.getByRole("listitem").filter({ hasText: "Preseleccionada" })).toContainText("Pendiente");

  // La preselecciona: pasa a "Preseleccionadas" y la candidata recibe el email
  await recruiter.getByLabel("Mover a Carla Díaz a").selectOption("shortlisted");
  await recruiter.getByRole("button", { name: "Mover", exact: true }).click();
  await expect(recruiter.getByRole("heading", { name: "Carla Díaz" })).toBeHidden();
  await recruiter.getByRole("link", { name: "Preseleccionadas 1" }).click();
  await expect(recruiter.getByRole("heading", { name: "Carla Díaz" })).toBeVisible();
  const recruiterJourney = recruiter.getByRole("list", { name: "Recorrido de la postulación" });
  await expect(recruiterJourney.locator('[aria-current="step"]')).toContainText("Preseleccionada");
  await expectNoA11yViolations(recruiter);
  const shortlistEmail = await lastEmailTo(candidateEmail);
  expect(shortlistEmail.Subject).toBe(`Novedades de tu postulación: ${title}`);
  expect(shortlistEmail.Text).toContain("te preseleccionó");

  // La descarta con la plantilla amable
  await recruiter.getByText("Descartar a Carla Díaz con un mensaje").click();
  await expect(recruiter.getByLabel("Mensaje para la persona")).toHaveValue(/Gracias por postularte a/);
  await recruiter.getByRole("button", { name: "Descartar y enviar mensaje" }).click();
  await recruiter.getByRole("link", { name: "Cerradas 1" }).click();
  await expect(recruiter.getByText("No seleccionada", { exact: true }).filter({ visible: true }).first()).toBeVisible();

  // La candidata ve el mensaje en su lista y en el email
  await candidate.goto("/es/mis-postulaciones");
  const item = candidate.getByRole("listitem").filter({ hasText: title });
  await expect(item.getByText("No seleccionada", { exact: true }).first()).toBeVisible();
  await expect(item.getByText(/Gracias por postularte a/)).toBeVisible();
  // La línea de tiempo se corta en "No seleccionada", con cada etapa por la que pasó.
  const steps = item.getByRole("list", { name: "Recorrido de la postulación" }).getByRole("listitem");
  await expect(steps).toHaveText([/^Recibida/, /^Vista/, /^Preseleccionada/, /^No seleccionada/]);
  await expectNoA11yViolations(candidate);
  await expect.poll(async () => (await lastEmailTo(candidateEmail)).Text).toContain("Mensaje de");
});
