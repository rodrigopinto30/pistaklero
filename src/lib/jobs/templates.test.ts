import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findTemplate, JOB_TEMPLATES } from "./templates";

// Las tecnologías salen del seed de la migración: si alguien renombra un slug, este test avisa.
const seeded = new Set(
  readdirSync("supabase/migrations")
    .map((file) => readFileSync(`supabase/migrations/${file}`, "utf8"))
    .join("\n")
    .match(/\('([a-z0-9-]+)', '[^']+', '[^']+', '(?:language|framework|tool|data|design|marketing|soft)'\)/g)
    ?.map((row) => row.slice(2, row.indexOf("'", 2))) ?? []
);

describe("plantillas de roles", () => {
  it("tienen slugs únicos", () => {
    expect(new Set(JOB_TEMPLATES.map((t) => t.slug)).size).toBe(JOB_TEMPLATES.length);
  });

  it.each(JOB_TEMPLATES)("$slug usa tecnologías que existen", (template) => {
    expect(seeded.size).toBeGreaterThan(50);
    for (const skill of template.skills) expect(seeded, skill).toContain(skill);
  });

  it.each(JOB_TEMPLATES)("$slug cumple las reglas del formulario en los dos idiomas", (template) => {
    for (const locale of ["es", "en"] as const) {
      expect(template[locale].title.length).toBeLessThanOrEqual(100);
      expect(template[locale].description.length).toBeGreaterThanOrEqual(20);
      expect(template[locale].description.length).toBeLessThanOrEqual(8000);
      expect(template[locale].description).not.toMatch(/<[a-z]/i);
    }
  });

  it("findTemplate ignora valores desconocidos", () => {
    expect(findTemplate("frontend-junior")?.seniority).toBe("junior");
    expect(findTemplate("../../etc")).toBeUndefined();
    expect(findTemplate(["frontend-junior"])).toBeUndefined();
  });
});
