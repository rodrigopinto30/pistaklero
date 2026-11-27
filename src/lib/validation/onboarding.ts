import { z } from "zod";

/** Acepta "acme.com" o "https://acme.com" y devuelve siempre una URL https. Vacío = sin sitio. */
export const optionalHttpsUrl = z
  .string()
  .trim()
  .max(200)
  .transform((value) => {
    if (value === "") return undefined;
    return /^https?:\/\//i.test(value) ? value.replace(/^http:/i, "https:") : `https://${value}`;
  })
  .pipe(z.url({ protocol: /^https$/, hostname: z.regexes.domain }).optional());

export const candidateOnboardingSchema = z.object({
  role: z.literal("candidate"),
  fullName: z.string().trim().min(2).max(80),
  headline: z.string().trim().max(100),
});

export const recruiterOnboardingSchema = z.object({
  role: z.literal("recruiter"),
  companyName: z.string().trim().min(2).max(80),
  websiteUrl: optionalHttpsUrl,
});

export const onboardingSchema = z.discriminatedUnion("role", [
  candidateOnboardingSchema,
  recruiterOnboardingSchema,
]);

export type OnboardingField = "role" | "fullName" | "headline" | "companyName" | "websiteUrl";
