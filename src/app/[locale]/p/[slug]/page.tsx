import { ExternalLink, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { cache, type ReactNode } from "react";
import { Avatar } from "@/components/avatar";
import { Masonry } from "@/components/masonry";
import { PostCard } from "@/components/posts/post-card";
import { getCurrentUser } from "@/lib/auth/session";
import { countryName, formatMonth, languageOptions } from "@/lib/geo";
import { projectPreviewUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { Markdown } from "@/components/markdown";

/*
 * Un reclutador primero registra la vista del día: la base limita a 200 perfiles "solo empresas" por día
 * (contra el robo masivo de perfiles). Después, RLS decide si puede verlo: si no, no hay fila y es un 404.
 * cache(): la metadata y la página comparten el mismo registro y la misma lectura.
 */
const loadCandidate = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data: access } = await supabase.rpc("register_profile_view", { p_slug: slug });
  if (access === "limit") return { limited: true as const, candidate: null };
  // Primero el id (por el índice del slug y solo si se puede ver); después la fila por id, que usa su índice
  // aunque haya miles de candidatos (buscar por slug obligaba a revisar la visibilidad de todos).
  const { data: id } = await supabase.rpc("visible_candidate_id", { p_slug: slug });
  if (!id) return { limited: false as const, candidate: null };
  const { data } = await supabase.from("candidates").select("*, people(full_name, avatar_path)").eq("user_id", id).maybeSingle();
  return { limited: false as const, candidate: data };
});

export async function generateMetadata({ params }: PageProps<"/[locale]/p/[slug]">): Promise<Metadata> {
  const { candidate } = await loadCandidate((await params).slug);
  if (!candidate) return {};
  return {
    title: candidate.people?.full_name,
    description: candidate.headline || undefined,
    // Solo los perfiles públicos se indexan.
    robots: { index: candidate.visibility === "public", follow: candidate.visibility === "public" },
  };
}

function Card({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  const id = `card-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={id} className={`flex flex-col gap-3 rounded-2xl bg-card shadow-soft p-5 ${className ?? ""}`}>
      <h2 id={id} className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function safeHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export default async function PublicProfilePage({ params }: PageProps<"/[locale]/p/[slug]">) {
  const { slug } = await params;
  const { limited, candidate } = await loadCandidate(slug);
  if (limited) {
    const tLimit = await getTranslations("PublicProfile.limit");
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">{tLimit("title")}</h1>
        <p className="text-muted-foreground">{tLimit("body")}</p>
      </div>
    );
  }
  if (!candidate) notFound();

  const locale = await getLocale();
  const t = await getTranslations("PublicProfile");
  const tp = await getTranslations("Profile");
  const supabase = await createClient();
  const id = candidate.user_id;

  const [skills, experiences, education, certifications, projects, posts] = await Promise.all([
    supabase.from("candidate_skills").select("level, skills(name_es, name_en)").eq("candidate_id", id),
    supabase.from("candidate_experiences").select("*").eq("candidate_id", id).order("start_date", { ascending: false }),
    supabase.from("candidate_education").select("*").eq("candidate_id", id).order("start_date", { ascending: false }),
    supabase.from("candidate_certifications").select("*").eq("candidate_id", id).order("issued_on", { ascending: false, nullsFirst: false }),
    supabase.from("candidate_projects").select("*").eq("candidate_id", id).order("created_at", { ascending: false }),
    supabase.rpc("post_cards", { p_author_id: id, p_limit: 12 }),
  ]);
  const signedIn = Boolean(await getCurrentUser());

  const period = (start: string, end: string | null) =>
    `${formatMonth(start, locale)} – ${end ? formatMonth(end, locale) : tp("entries.present")}`;
  const location = [candidate.city, countryName(candidate.country, locale)].filter(Boolean).join(", ");
  const languages = languageOptions(locale).filter((l) => candidate.languages.includes(l.code));
  const links = [
    candidate.github_url && { label: "GitHub", url: candidate.github_url },
    candidate.linkedin_url && { label: "LinkedIn", url: candidate.linkedin_url },
    candidate.website_url && { label: safeHost(candidate.website_url), url: candidate.website_url },
  ].filter(Boolean) as { label: string; url: string }[];

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-8 md:grid-cols-3">
      {/* Encabezado */}
      <section className="flex flex-col gap-4 rounded-2xl bg-card shadow-soft p-6 md:col-span-2 md:flex-row md:items-center">
        <Avatar path={candidate.people?.avatar_path} name={candidate.people?.full_name ?? ""} size="xl" />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{candidate.people?.full_name}</h1>
          {candidate.headline && <p className="text-lg text-muted-foreground">{candidate.headline}</p>}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground">
              {t("availability", { value: tp(`preferences.availabilityOptions.${candidate.availability}`) })}
            </span>
            {location && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <MapPin aria-hidden="true" className="size-4" />
                {location}
              </span>
            )}
          </div>
        </div>
      </section>

      <Card title={t("links")}>
        {links.length > 0 && (
          <ul className="flex flex-col gap-2">
            {links.map((link) => (
              <li key={link.url}>
                <a href={link.url} rel="noopener noreferrer nofollow ugc" target="_blank" className="inline-flex items-center gap-1 text-violet underline-offset-4 hover:underline">
                  {link.label}
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
              </li>
            ))}
          </ul>
        )}
        {languages.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {t("languages")}:{" "}
            {languages.map((l, i) => (
              <span key={l.code} lang={l.code}>
                {i > 0 && ", "}
                {l.name}
              </span>
            ))}
          </p>
        )}
      </Card>

      {candidate.bio && (
        <Card title={t("about")} className="md:col-span-2">
          <Markdown>{candidate.bio}</Markdown>
        </Card>
      )}

      {(skills.data ?? []).length > 0 && (
        <Card title={t("skills")}>
          <ul className="flex flex-wrap gap-2">
            {skills.data!.map((s, i) => (
              <li key={i} className="rounded-full bg-secondary px-3 py-1 text-sm">
                {(locale === "en" ? s.skills?.name_en : s.skills?.name_es) ?? ""}{" "}
                <span className="text-muted-foreground">· {tp(`skills.levelOptions.${s.level}`)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(projects.data ?? []).length > 0 && (
        <Card title={t("projects")} className="md:col-span-3">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.data!.map((p) => (
              <li key={p.id} className="flex flex-col gap-2 overflow-hidden rounded-xl bg-muted/60 p-4">
                {p.preview_path && (
                  // Decorativa: el título y el enlace dicen de qué se trata. WebP 1200×630 ya optimizado.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={projectPreviewUrl(p.preview_path)!}
                    alt=""
                    width={1200}
                    height={630}
                    loading="lazy"
                    className="-mx-4 -mt-4 mb-1 aspect-[1200/630] w-[calc(100%+2rem)] max-w-none object-cover"
                  />
                )}
                <h3 className="font-medium">{p.title}</h3>
                {p.description && <div className="text-sm text-muted-foreground"><Markdown>{p.description}</Markdown></div>}
                <div className="mt-auto flex flex-wrap gap-3 text-sm">
                  {p.url && (
                    <a href={p.url} rel="noopener noreferrer nofollow ugc" target="_blank" className="text-violet underline-offset-4 hover:underline">
                      <span className="sr-only">{t("viewProject", { project: p.title })}: </span>
                      {safeHost(p.url)}
                    </a>
                  )}
                  {p.repo_url && (
                    <a href={p.repo_url} rel="noopener noreferrer nofollow ugc" target="_blank" className="text-violet underline-offset-4 hover:underline">
                      <span className="sr-only">{t("viewRepo", { project: p.title })}: </span>
                      {safeHost(p.repo_url)}
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(experiences.data ?? []).length > 0 && (
        <Card title={t("experience")} className="md:col-span-2">
          <ol className="flex flex-col gap-4">
            {experiences.data!.map((e) => (
              <li key={e.id} className="flex flex-col gap-1">
                <h3 className="font-medium">
                  {e.title} · <span className="text-muted-foreground">{e.company_name}</span>
                </h3>
                <p className="text-sm text-muted-foreground">{period(e.start_date, e.end_date)}</p>
                {e.description && <div className="text-sm"><Markdown>{e.description}</Markdown></div>}
              </li>
            ))}
          </ol>
        </Card>
      )}

      {(education.data ?? []).length > 0 && (
        <Card title={t("education")}>
          <ol className="flex flex-col gap-3">
            {education.data!.map((e) => (
              <li key={e.id}>
                <h3 className="font-medium">{e.degree}</h3>
                <p className="text-sm text-muted-foreground">
                  {e.institution} · {period(e.start_date, e.end_date)}
                </p>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {(certifications.data ?? []).length > 0 && (
        <Card title={t("certifications")}>
          <ul className="flex flex-col gap-3">
            {certifications.data!.map((c) => (
              <li key={c.id}>
                <h3 className="font-medium">
                  {c.credential_url ? (
                    <a href={c.credential_url} rel="noopener noreferrer nofollow ugc" target="_blank" aria-label={t("viewCredential", { name: c.name })} className="text-violet underline-offset-4 hover:underline">
                      {c.name}
                    </a>
                  ) : (
                    c.name
                  )}
                </h3>
                <p className="text-sm text-muted-foreground">{[c.issuer, formatMonth(c.issued_on, locale)].filter(Boolean).join(" · ")}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(posts.data ?? []).length > 0 && (
        <section aria-labelledby="profile-posts" className="flex flex-col gap-4 md:col-span-3">
          <h2 id="profile-posts" className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {t("posts")}
          </h2>
          <Masonry className="lg:columns-3 xl:columns-3">
            {posts.data!.map((post) => (
              <li key={post.id}>
                <PostCard post={post} locale={locale} signedIn={signedIn} />
              </li>
            ))}
          </Masonry>
        </section>
      )}
    </div>
  );
}
