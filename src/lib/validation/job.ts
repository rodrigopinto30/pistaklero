import { z } from "zod";
import { COUNTRY_CODES } from "@/lib/geo";
import { CURRENCIES, SALARY_BASES, SALARY_PERIODS } from "./profile";

export const SENIORITIES = ["trainee", "junior", "semi_senior", "senior", "lead"] as const;
export const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "internship", "freelance"] as const;
export const WORK_MODES = ["remote", "hybrid", "onsite"] as const;
export const VALID_DAYS = ["15", "30", "60", "90"] as const;
export const QUESTION_TYPES = ["none", "short_text", "single_choice"] as const;

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

/** Una pregunta filtro: sin tipo = no hay pregunta. Las opciones van una por línea. */
const question = z
  .object({
    type: z.enum(QUESTION_TYPES),
    prompt: z.string().trim().max(200),
    options: z.string().max(500),
  })
  .transform((q) => ({
    ...q,
    optionList: q.options
      .split("\n")
      .map((option) => option.trim())
      .filter(Boolean),
  }));

export const jobSchema = z
  .object({
    title: z.string().trim().min(3).max(100),
    description: z.string().trim().min(20).max(8000),
    language: z.enum(["es", "en"]),
    seniority: z.enum(SENIORITIES),
    employmentType: z.enum(EMPLOYMENT_TYPES),
    workMode: z.enum(WORK_MODES),
    country: z.preprocess(emptyToUndefined, z.enum(COUNTRY_CODES).optional()),
    city: z.string().trim().max(80),
    salaryMin: z.coerce.number({ error: "amount_positive" }).positive({ error: "amount_positive" }).max(1_000_000_000),
    salaryMax: z.coerce.number({ error: "amount_positive" }).positive({ error: "amount_positive" }).max(1_000_000_000),
    salaryCurrency: z.enum(CURRENCIES),
    salaryPeriod: z.enum(SALARY_PERIODS),
    salaryBasis: z.enum(SALARY_BASES),
    validDays: z.enum(VALID_DAYS),
    skills: z.array(z.uuid()).max(10),
    question1: question,
    question2: question,
  })
  .superRefine((job, ctx) => {
    if (job.workMode !== "remote" && !job.country) {
      ctx.addIssue({ code: "custom", path: ["country"], message: "required_unless_remote" });
    }
    if (job.salaryMax < job.salaryMin) {
      ctx.addIssue({ code: "custom", path: ["salaryMax"], message: "max_below_min" });
    } else if (job.salaryMax > job.salaryMin * 3) {
      ctx.addIssue({ code: "custom", path: ["salaryMax"], message: "range_too_wide" });
    }
    for (const key of ["question1", "question2"] as const) {
      const q = job[key];
      if (q.type === "none") continue;
      if (q.prompt.length < 3) ctx.addIssue({ code: "custom", path: [`${key}Prompt`], message: "required" });
      if (q.type === "single_choice" && (q.optionList.length < 2 || q.optionList.length > 5 || q.optionList.some((o) => o.length > 80))) {
        ctx.addIssue({ code: "custom", path: [`${key}Options`], message: "options" });
      }
    }
  });

export type JobInput = z.infer<typeof jobSchema>;

/** Arma el objeto a validar a partir del FormData (campos planos y listas). */
export function jobInputFromForm(formData: FormData) {
  const text = (name: string) => String(formData.get(name) ?? "");
  return {
    title: text("title"),
    description: text("description"),
    language: text("language"),
    seniority: text("seniority"),
    employmentType: text("employmentType"),
    workMode: text("workMode"),
    country: text("country"),
    city: text("city"),
    salaryMin: text("salaryMin"),
    salaryMax: text("salaryMax"),
    salaryCurrency: text("salaryCurrency"),
    salaryPeriod: text("salaryPeriod"),
    salaryBasis: text("salaryBasis"),
    validDays: text("validDays"),
    skills: formData.getAll("skills").map(String),
    question1: { type: text("question1Type") || "none", prompt: text("question1Prompt"), options: text("question1Options") },
    question2: { type: text("question2Type") || "none", prompt: text("question2Prompt"), options: text("question2Options") },
  };
}
