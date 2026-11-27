import { MapPin } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { Avatar } from "@/components/avatar";
import { Emoji } from "@/components/emoji";
import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { countryName, countryOptions } from "@/lib/geo";
import { createClient } from "@/lib/supabase/server";
import { getPathname, Link, redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

const PAGE_SIZE = 24;
const AVAILABILITY = ["immediate", "two_weeks", "freelance_only", "not_looking"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Talent");
  return { title: t("title"), robots: { index: false } };
}

/**
 * Talento: las empresas exploran perfiles (los que no están ocultos y no las bloquearon).
 * La tarjeta muestra lo justo; el perfil completo se abre aparte (y cuenta como visita).
 */
export default async function TalentPage({ searchParams }: PageProps<"/[locale]/talent">) {
  await connection();
  const locale = (await getLocale()) as AppLocale;
  if (!(await getCurrentUser())) redirect({ href: { pathname: "/sign-in", query: { next: getPathname({ locale, href: "/talent" }) } }, locale });
  const profile = await getCurrentProfile();
  if (profile?.role !== "recruiter" && profile?.role !== "admin") redirect({ href: "/", locale });

  const t = await getTranslations("Talent");
  const tAvailability = await getTranslations("Profile.preferences.availabilityOptions");
  const params = await searchParams;
  const text = (key: string) => (typeof params[key] === "string" ? (params[key] as string).trim().slice(0, 100) : "");
  const q = text("q");
  const skill = text("skill");
  const country = text("country");
  const availability = AVAILABILITY.find((a) => a === text("availability"));
  const page = Math.min(Math.max(Number(params.page) || 1, 1), 20);

  const supabase = await createClient();
  const [{ data }, { data: skills }] = await Promise.all([
    supabase.rpc("talent_cards", {
      p_query: q || undefined,
      p_skill: skill || undefined,
      p_country: country || undefined,
      p_availability: availability,
      p_limit: PAGE_SIZE * page,
    }),
    supabase.from("skills").select("slug, name_es, name_en").order("slug"),
  ]);
  const people = data ?? [];
  const total = Number(people[0]?.total_count ?? 0);
  const skillName = (s: { name_es: string; name_en: string }) => (locale === "en" ? s.name_en : s.name_es);
  const filters = { ...(q ? { q } : {}), ...(skill ? { skill } : {}), ...(country ? { country } : {}), ...(availability ? { availability } : {}) };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t("title")} <Emoji symbol="🧑‍💻" />
        </h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Filtros: un formulario GET (funciona sin JavaScript y la URL se puede compartir). */}
      <form method="get" action={getPathname({ locale, href: "/talent" })} className="grid gap-3 rounded-2xl bg-card p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
        {q && <input type="hidden" name="q" value={q} />}
        <div className="flex flex-col gap-2">
          <Label htmlFor="talent-skill">{t("skill")}</Label>
          <NativeSelect id="talent-skill" name="skill" defaultValue={skill}>
            <option value="">{t("any")}</option>
            {(skills ?? []).map((s) => (
              <option key={s.slug} value={s.slug}>
                {skillName(s)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="talent-country">{t("country")}</Label>
          <NativeSelect id="talent-country" name="country" defaultValue={country}>
            <option value="">{t("any")}</option>
            {countryOptions(locale).map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="talent-availability">{t("availability")}</Label>
          <NativeSelect id="talent-availability" name="availability" defaultValue={availability ?? ""}>
            <option value="">{t("any")}</option>
            {AVAILABILITY.map((a) => (
              <option key={a} value={a}>
                {tAvailability(a)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <button type="submit" className={buttonVariants({ variant: "secondary" })}>
          {t("apply")}
        </button>
      </form>

      <p role="status" className="text-sm text-muted-foreground">
        {q ? t("countFor", { count: total, query: q }) : t("count", { count: total })}
      </p>

      {people.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((person) => {
            const location = [person.city, countryName(person.country, locale)].filter(Boolean).join(", ");
            const chips = (person.skills ?? []) as { slug: string; es: string; en: string }[];
            return (
              <li key={person.user_id}>
                <article aria-labelledby={`talent-${person.user_id}`} className="relative flex h-full flex-col gap-3 rounded-2xl bg-card p-5 shadow-soft transition-shadow hover:shadow-soft-lg">
                  <div className="flex items-center gap-3">
                    <Avatar path={person.avatar_path} name={person.full_name} size="lg" />
                    <div className="flex min-w-0 flex-col">
                      <h2 id={`talent-${person.user_id}`} className="truncate font-semibold">
                        {/* El enlace cubre toda la tarjeta; su nombre accesible es el de la persona. */}
                        <Link href={{ pathname: "/p/[slug]", params: { slug: person.slug } }} className="after:absolute after:inset-0 after:rounded-2xl">
                          {person.full_name}
                        </Link>
                      </h2>
                      {person.headline && <p className="truncate text-sm text-muted-foreground">{person.headline}</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    {location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin aria-hidden="true" className="size-4" />
                        {location}
                      </span>
                    )}
                    <span className={person.availability === "not_looking" ? "" : "font-medium text-verified"}>{tAvailability(person.availability)}</span>
                  </div>
                  {chips.length > 0 && (
                    <ul aria-label={t("skills")} className="flex flex-wrap gap-1.5">
                      {chips.map((chip) => (
                        <li key={chip.slug} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
                          {locale === "en" ? chip.en : chip.es}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-2xl bg-card p-6 shadow-soft">
          <p>
            <Emoji symbol="🔍" className="mr-1.5" />
            {t("empty")}
          </p>
          <Link href="/talent" className={buttonVariants({ variant: "outline" })}>
            {t("clear")}
          </Link>
        </div>
      )}

      {people.length < total && (
        <Link href={{ pathname: "/talent", query: { ...filters, page: String(page + 1) } }} className={buttonVariants({ variant: "outline", className: "self-center" })}>
          {t("more")}
        </Link>
      )}
    </div>
  );
}
