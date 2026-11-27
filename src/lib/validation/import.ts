import { z } from "zod";
import { COUNTRY_CODES } from "@/lib/geo";
import { EMPLOYMENT_TYPES, SENIORITIES, VALID_DAYS, WORK_MODES } from "./job";
import { optionalHttpsUrl } from "./onboarding";
import { CURRENCIES, SALARY_BASES, SALARY_PERIODS } from "./profile";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalNumber = z.preprocess(emptyToUndefined, z.coerce.number().positive().max(1_000_000_000).optional());

/**
 * Lo que devuelve Claude al leer una oferta pegada. Es solo una propuesta para completar el formulario:
 * el admin la revisa y lo que se publica se valida con importedJobSchema.
 */
export const extractedJobSchema = z.object({
  companyName: z.string(),
  companyWebsite: z.string().nullable(),
  title: z.string(),
  summary: z.string(),
  language: z.enum(["es", "en"]),
  seniority: z.enum(SENIORITIES),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  workMode: z.enum(WORK_MODES),
  country: z.string().nullable(),
  city: z.string().nullable(),
  salaryMin: z.number().nullable(),
  salaryMax: z.number().nullable(),
  salaryCurrency: z.enum(CURRENCIES).nullable(),
  salaryPeriod: z.enum(SALARY_PERIODS).nullable(),
  salaryBasis: z.enum(SALARY_BASES).nullable(),
});
export type ExtractedJob = z.infer<typeof extractedJobSchema>;

/** Oferta importada lista para publicar: salario opcional, enlace al original obligatorio. */
export const importedJobSchema = z
  .object({
    companyName: z.string().trim().min(2).max(80),
    companyWebsite: optionalHttpsUrl,
    externalUrl: z.string().trim().pipe(z.url({ protocol: /^https$/, hostname: z.regexes.domain })),
    title: z.string().trim().min(3).max(100),
    summary: z.string().trim().min(20).max(600),
    language: z.enum(["es", "en"]),
    seniority: z.enum(SENIORITIES),
    employmentType: z.enum(EMPLOYMENT_TYPES),
    workMode: z.enum(WORK_MODES),
    country: z.preprocess(emptyToUndefined, z.enum(COUNTRY_CODES).optional()),
    city: z.string().trim().max(80),
    salaryMin: optionalNumber,
    salaryMax: optionalNumber,
    salaryCurrency: z.preprocess(emptyToUndefined, z.enum(CURRENCIES).optional()),
    salaryPeriod: z.preprocess(emptyToUndefined, z.enum(SALARY_PERIODS).optional()),
    salaryBasis: z.preprocess(emptyToUndefined, z.enum(SALARY_BASES).optional()),
    validDays: z.enum(VALID_DAYS),
  })
  .superRefine((job, ctx) => {
    if (job.workMode !== "remote" && !job.country) {
      ctx.addIssue({ code: "custom", path: ["country"], message: "required_unless_remote" });
    }
    const salary = [job.salaryMin, job.salaryMax, job.salaryCurrency, job.salaryPeriod, job.salaryBasis];
    const filled = salary.filter((value) => value !== undefined).length;
    if (filled > 0 && filled < salary.length) {
      ctx.addIssue({ code: "custom", path: [job.salaryMin === undefined ? "salaryMin" : "salaryMax"], message: "required" });
    } else if (job.salaryMin !== undefined && job.salaryMax !== undefined) {
      if (job.salaryMax < job.salaryMin) ctx.addIssue({ code: "custom", path: ["salaryMax"], message: "max_below_min" });
      else if (job.salaryMax > job.salaryMin * 3) ctx.addIssue({ code: "custom", path: ["salaryMax"], message: "range_too_wide" });
    }
  });
