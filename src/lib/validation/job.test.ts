import { describe, expect, it } from "vitest";
import { jobSchema } from "./job";

const valid = {
  title: "Frontend Junior",
  description: "Vas a trabajar con React y TypeScript en un equipo chico.",
  language: "es",
  seniority: "junior",
  employmentType: "full_time",
  workMode: "remote",
  country: "",
  city: "",
  salaryMin: "1000",
  salaryMax: "1500",
  salaryCurrency: "USD",
  salaryPeriod: "month",
  salaryBasis: "gross",
  validDays: "30",
  skills: [],
  question1: { type: "none", prompt: "", options: "" },
  question2: { type: "none", prompt: "", options: "" },
};

const errorPaths = (input: object) => jobSchema.safeParse(input).error?.issues.map((i) => i.path.join(".")) ?? [];

describe("jobSchema", () => {
  it("acepta una oferta remota con salario", () => {
    const job = jobSchema.parse(valid);
    expect(job.salaryMin).toBe(1000);
    expect(job.country).toBeUndefined();
  });

  it("exige país si no es remota", () => {
    expect(errorPaths({ ...valid, workMode: "onsite" })).toContain("country");
  });

  it.each([
    ["el máximo es menor al mínimo", "1500", "1000"],
    ["el rango es demasiado amplio", "1000", "5000"],
  ])("rechaza el salario cuando %s", (_, salaryMin, salaryMax) => {
    expect(errorPaths({ ...valid, salaryMin, salaryMax })).toContain("salaryMax");
  });

  it("exige salario", () => {
    expect(errorPaths({ ...valid, salaryMin: "" })).toContain("salaryMin");
  });

  it("una pregunta de opción única necesita entre 2 y 5 opciones", () => {
    const one = { ...valid, question1: { type: "single_choice", prompt: "¿Inglés?", options: "Sí" } };
    expect(errorPaths(one)).toContain("question1Options");
    const ok = { ...valid, question1: { type: "single_choice", prompt: "¿Inglés?", options: "Básico\nIntermedio\n\nAvanzado" } };
    expect(jobSchema.parse(ok).question1.optionList).toEqual(["Básico", "Intermedio", "Avanzado"]);
  });

  it("una pregunta necesita enunciado", () => {
    expect(errorPaths({ ...valid, question2: { type: "short_text", prompt: "", options: "" } })).toContain("question2Prompt");
  });

  it("acepta hasta 10 tecnologías", () => {
    const skills = Array.from({ length: 11 }, () => crypto.randomUUID());
    expect(errorPaths({ ...valid, skills })).toContain("skills");
  });
});
