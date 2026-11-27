import { readFile } from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { expect, onboardAsCompany, signIn, signInAsReadyCandidate, test, uniqueEmail } from "./support/fixtures";

async function pdfText(path: string) {
  const pdf = await getDocument({ data: new Uint8Array(await readFile(path)) }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    text += content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
  }
  return text;
}

test("la candidata ve y descarga su CV en formato Harvard, con texto real", async ({ page }) => {
  await signInAsReadyCandidate(page, "Ñandú Łópez");
  await page.goto("/es/perfil");

  // Vista previa: se abre en el navegador (pestaña nueva), sin descargar.
  const preview = page.getByRole("link", { name: /^Ver CV/ });
  await expect(preview).toHaveAttribute("target", "_blank");
  const inline = await page.request.get((await preview.getAttribute("href"))!);
  expect(inline.headers()["content-type"]).toBe("application/pdf");
  expect(inline.headers()["content-disposition"]).toMatch(/^inline; filename="cv-harvard-.+\.pdf"$/);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Descargar CV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^cv-harvard-.+\.pdf$/);

  const text = await pdfText((await download.path())!);
  expect(text).toContain("Ñandú Łópez");
  expect(text).toContain("Proyectos");
  expect(text).toContain("Habilidades e idiomas");
});

test("el CV es solo de la propia candidata", async ({ page, request }) => {
  expect((await request.get("/api/me/cv")).status()).toBe(401);

  const domain = `cv-${Date.now()}.com`;
  await signIn(page, uniqueEmail("rrhh", domain));
  await onboardAsCompany(page, "CV SA", domain);
  expect((await page.request.get("/api/me/cv")).status()).toBe(403);
});
