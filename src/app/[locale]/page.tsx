import { getTranslations } from "next-intl/server";

export default async function Home() {
  const t = await getTranslations("Home");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">
        Pista<span className="text-primary">klero</span>
      </h1>
      <p className="max-w-md text-muted-foreground">{t("tagline")}</p>
    </div>
  );
}
