import { getFormatter, getTranslations } from "next-intl/server";

type Namespace = "Legal.terms" | "Legal.privacy" | "Legal.accessibility";

/** Página de texto (términos, privacidad, accesibilidad): un h1 y secciones con h2. */
export async function LegalPage({ namespace, sections }: { namespace: Namespace; sections: string[] }) {
  const t = await getTranslations(namespace);
  const tLegal = await getTranslations("Legal");
  const format = await getFormatter();
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hola@pistaklero.com";

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {tLegal("updated", { date: format.dateTime(new Date("2026-11-27T12:00:00Z"), { dateStyle: "long" }) })}
        </p>
        <p className="text-muted-foreground">{t("intro")}</p>
      </header>
      {sections.map((key) => (
        <section key={key} aria-labelledby={`section-${key}`} className="flex flex-col gap-2">
          <h2 id={`section-${key}`} className="text-xl font-semibold">
            {t(`sections.${key}.title` as Parameters<typeof t>[0])}
          </h2>
          <p className="leading-relaxed whitespace-pre-line text-foreground/90">
            {t(`sections.${key}.body` as Parameters<typeof t>[0], { email })}
          </p>
        </section>
      ))}
    </article>
  );
}
