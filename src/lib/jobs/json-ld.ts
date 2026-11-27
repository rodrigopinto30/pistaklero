/*
 * Datos estructurados JobPosting (schema.org, JSON-LD del W3C) para que Google Jobs indexe las ofertas nativas.
 * https://developers.google.com/search/docs/appearance/structured-data/job-posting
 */
type JobForLd = {
  title: string;
  external_url?: string | null;
  description: string;
  published_at: string | null;
  valid_through: string;
  employment_type: "full_time" | "part_time" | "contract" | "internship" | "freelance";
  work_mode: "remote" | "hybrid" | "onsite";
  country: string | null;
  city: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_period: "hour" | "month" | "year" | null;
  slug: string;
};
type CompanyForLd = { name: string; website_url: string | null; logoUrl: string | null };

const EMPLOYMENT: Record<JobForLd["employment_type"], string> = {
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  contract: "CONTRACTOR",
  internship: "INTERN",
  freelance: "CONTRACTOR",
};
const PERIOD = { hour: "HOUR", month: "MONTH", year: "YEAR" } as const;

export function jobPostingJsonLd(job: JobForLd, company: CompanyForLd, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    identifier: { "@type": "PropertyValue", name: company.name, value: job.slug },
    datePosted: job.published_at ?? undefined,
    validThrough: job.valid_through,
    employmentType: EMPLOYMENT[job.employment_type],
    // Con link externo, la postulación es en el sitio de la empresa.
    directApply: !job.external_url,
    url,
    hiringOrganization: {
      "@type": "Organization",
      name: company.name,
      ...(company.website_url ? { sameAs: company.website_url } : {}),
      ...(company.logoUrl ? { logo: company.logoUrl } : {}),
    },
    ...(job.work_mode === "remote"
      ? {
          jobLocationType: "TELECOMMUTE",
          ...(job.country ? { applicantLocationRequirements: { "@type": "Country", name: job.country } } : {}),
        }
      : {
          jobLocation: {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              addressCountry: job.country ?? undefined,
              ...(job.city ? { addressLocality: job.city } : {}),
            },
          },
        }),
    ...(job.salary_min != null && job.salary_max != null && job.salary_currency && job.salary_period
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: job.salary_currency,
            value: { "@type": "QuantitativeValue", minValue: job.salary_min, maxValue: job.salary_max, unitText: PERIOD[job.salary_period] },
          },
        }
      : {}),
  };
}

/**
 * Serializa para un <script type="application/ld+json">. Escapa "<" para que un título como
 * "</script><script>…" no pueda cerrar la etiqueta e inyectar HTML (OWASP A05).
 */
export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
