import { emailOf, expect, expectNoA11yViolations, MAILPIT_URL, onboardAsCompany, publishJobFor, signIn, signInAsReadyCandidate, test, uniqueEmail } from "./support/fixtures";

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
  const domain = `pipeline-${Date.now()}.com`;
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
  await candidate.getByRole("button", { name: "Postularme" }).click();
  await expect(candidate.getByRole("status").filter({ hasText: "Tu postulación fue enviada" })).toBeVisible();

  // La empresa la ve en "Nuevas"
  await recruiter.goto("/es/panel");
  await recruiter.getByRole("link", { name: /1 postulación · 1 sin revisar/ }).click();
  await recruiter.waitForURL(`/es/panel/ofertas/${job.id}/postulantes`);
  await expect(recruiter.getByRole("link", { name: "Nuevas 1" })).toHaveAttribute("aria-current", "page");
  await expect(recruiter.getByRole("heading", { name: "Carla Díaz" })).toBeVisible();
  await expectNoA11yViolations(recruiter);

  // La pasa a revisión: la candidata recibe el aviso
  await recruiter.getByLabel("Mover a Carla Díaz a").selectOption("in_review");
  await recruiter.getByRole("button", { name: "Mover", exact: true }).click();
  await expect(recruiter.getByRole("heading", { name: "Carla Díaz" })).toBeHidden();
  await recruiter.getByRole("link", { name: "En revisión 1" }).click();
  await expect(recruiter.getByRole("heading", { name: "Carla Díaz" })).toBeVisible();
  const reviewEmail = await lastEmailTo(candidateEmail);
  expect(reviewEmail.Subject).toBe(`Novedades de tu postulación: ${title}`);
  expect(reviewEmail.Text).toContain("está revisando tu postulación");

  // La descarta con la plantilla amable
  await recruiter.getByText("Descartar a Carla Díaz con un mensaje").click();
  await expect(recruiter.getByLabel("Mensaje para la persona")).toHaveValue(/Gracias por postularte a/);
  await recruiter.getByRole("button", { name: "Descartar y enviar mensaje" }).click();
  await recruiter.getByRole("link", { name: "Cerradas 1" }).click();
  await expect(recruiter.getByText("No seleccionada", { exact: true }).filter({ visible: true })).toBeVisible();

  // La candidata ve el mensaje en su lista y en el email
  await candidate.goto("/es/mis-postulaciones");
  const item = candidate.getByRole("listitem").filter({ hasText: title });
  await expect(item.getByText("No seleccionada", { exact: true })).toBeVisible();
  await expect(item.getByText(/Gracias por postularte a/)).toBeVisible();
  await expect.poll(async () => (await lastEmailTo(candidateEmail)).Text).toContain("Mensaje de");
});
