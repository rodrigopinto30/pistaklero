import { BadgeCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { brandHue } from "@/lib/companies/brand";
import { countryName } from "@/lib/geo";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { getPathname, Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { CompanyActions } from "./company-actions";
import { CompanyCover } from "./company-cover";

export type CompanyCardData = Database["public"]["Functions"]["company_cards"]["Returns"][number];

// Altos variados para la grilla intercalada: cada empresa tiene siempre el mismo (sale de su nombre).
const SHAPES = ["aspect-[4/5]", "aspect-[3/4]", "aspect-square", "aspect-[2/3]", "aspect-[5/6]"];

/**
 * Tarjeta de empresa estilo Pinterest: la portada de fondo, un degradé oscuro abajo y encima,
 * en blanco, el nombre, el rubro, la ubicación y lo que tiene abierto. Toda la tarjeta lleva a su página.
 */
export async function CompanyCard({ company, locale, signedIn }: { company: CompanyCardData; locale: string; signedIn: boolean }) {
  const t = await getTranslations("Companies");
  const href = { pathname: "/companies/[slug]" as const, params: { slug: company.slug } };
  const location = [company.city, countryName(company.country, locale)].filter(Boolean).join(", ");
  // Sin sesión, "me gusta" y "guardar" quedan pendientes y se vuelve al listado (con JavaScript, a la página exacta).
  const guestReturnTo = signedIn ? undefined : getPathname({ locale: locale as AppLocale, href: "/companies" });

  return (
    <article aria-labelledby={`company-${company.id}`} className={cn("group relative overflow-hidden rounded-3xl bg-muted shadow-soft transition-shadow hover:shadow-soft-lg", SHAPES[brandHue(company.name) % SHAPES.length])}>
      <CompanyCover name={company.name} coverPath={company.cover_path} logoPath={company.logo_path} className="absolute inset-0 size-full transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none" />
      {/* Degradé para que el texto blanco se lea sobre cualquier portada. */}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
      <div className="absolute top-3 right-3">
        <CompanyActions companyId={company.id} name={company.name} liked={company.liked} saved={company.saved} likes={company.likes_count} guestReturnTo={guestReturnTo} />
      </div>
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5 text-white">
        <h3 id={`company-${company.id}`} className="text-xl leading-tight font-semibold">
          {/* El enlace cubre toda la tarjeta con ::after, pero su nombre accesible es solo el de la empresa. */}
          <Link href={href} className="after:absolute after:inset-0">
            {company.name}
          </Link>
          {company.verified && (
            <>
              <BadgeCheck aria-hidden="true" className="ml-1.5 inline size-5 align-[-3px]" />
              <span className="sr-only">{t("verified")}</span>
            </>
          )}
        </h3>
        {(company.industry || location) && <p className="text-sm text-white/90">{[company.industry, location].filter(Boolean).join(" · ")}</p>}
        <p className="text-sm text-white/90">
          {t("openJobs", { count: Number(company.open_jobs) })}
          {company.likes_count > 0 && ` · ${t("likes", { count: company.likes_count })}`}
        </p>
      </div>
    </article>
  );
}
