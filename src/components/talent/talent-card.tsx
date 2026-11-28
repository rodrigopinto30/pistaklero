import { MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Avatar } from "@/components/avatar";
import { countryName } from "@/lib/geo";
import type { Database } from "@/lib/supabase/database.types";
import { Link } from "@/i18n/navigation";
import { SaveCandidateButton } from "./save-candidate-button";
import { MessageButton } from "@/components/messages/message-button";

type Person = {
  user_id: string;
  slug: string;
  full_name: string;
  avatar_path: string | null;
  headline: string | null;
  city: string | null;
  country: string | null;
  availability: Database["public"]["Enums"]["availability"];
  skills: unknown;
};

/**
 * Tarjeta de una persona para las empresas (Talento y perfiles guardados): foto, nombre, titular,
 * dónde está, disponibilidad y sus habilidades principales. Toda la tarjeta abre el perfil; el
 * marcador (por encima del enlace) la guarda para el equipo.
 */
export async function TalentCard({ person, locale, saved, note, headingLevel = 2 }: { person: Person; locale: string; saved?: boolean; note?: string; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const t = await getTranslations("Talent");
  const tAvailability = await getTranslations("Profile.preferences.availabilityOptions");
  const location = [person.city, countryName(person.country, locale)].filter(Boolean).join(", ");
  const chips = (person.skills ?? []) as { slug: string; es: string; en: string }[];

  return (
    <article aria-labelledby={`talent-${person.user_id}`} className="relative flex h-full flex-col gap-3 rounded-2xl bg-card p-5 shadow-soft transition-shadow hover:shadow-soft-lg">
      <div className="flex items-center gap-3">
        <Avatar path={person.avatar_path} name={person.full_name} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col">
          <Heading id={`talent-${person.user_id}`} className="min-w-0 font-semibold">
            {/* El enlace cubre toda la tarjeta; su nombre accesible es el de la persona. */}
            {/* 24 px de alto: objetivo táctil mínimo aunque tenga los botones al lado (WCAG 2.5.8). */}
            <Link href={{ pathname: "/p/[slug]", params: { slug: person.slug } }} className="block truncate leading-6 after:absolute after:inset-0 after:rounded-2xl">
              {person.full_name}
            </Link>
          </Heading>
          {person.headline && <p className="truncate text-sm text-muted-foreground">{person.headline}</p>}
        </div>
        {saved !== undefined && (
          <div className="-m-2 flex self-start">
            <MessageButton userId={person.user_id} name={person.full_name} variant="icon" />
            <SaveCandidateButton candidateId={person.user_id} name={person.full_name} saved={saved} />
          </div>
        )}
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
      {note && <p className="mt-auto text-xs text-muted-foreground">{note}</p>}
    </article>
  );
}
