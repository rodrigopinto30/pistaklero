import { getFormatter, getTranslations } from "next-intl/server";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { setSourceActive, syncSourceNow } from "./actions";
import { SourceForm } from "./source-form";

type Result = { created: number; updated: number; skipped: number; closed: number };

export async function SourcesSection() {
  const t = await getTranslations("Import.sources");
  const format = await getFormatter();
  const supabase = await createClient();
  const { data: sources } = await supabase.rpc("admin_import_sources");

  return (
    <SectionCard id="sources" title={t("title")} description={t("hint")}>
      <SourceForm />
      {(sources ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border" aria-label={t("listLabel")}>
          {sources!.map((source) => {
            const result = source.last_result as Result | null;
            const label = `${source.company_name} (${t(`providers.${source.provider as "greenhouse"}`)})`;
            return (
              <li key={source.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="font-medium">
                    <Link href={{ pathname: "/companies/[slug]", params: { slug: source.company_slug } }} className="underline-offset-4 hover:underline">
                      {source.company_name}
                    </Link>{" "}
                    <span className="text-sm text-muted-foreground">
                      · {t(`providers.${source.provider as "greenhouse"}`)} · <code>{source.board_token}</code>
                      {!source.active && <> · {t("paused")}</>}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("openJobs", { count: Number(source.open_jobs) })}
                    {" · "}
                    {source.last_synced_at
                      ? t("lastSync", { date: format.dateTime(new Date(source.last_synced_at), { dateStyle: "short", timeStyle: "short" }) })
                      : t("neverSynced")}
                    {result && source.last_synced_at && !source.last_error && <> · {t("result", result)}</>}
                  </p>
                  {source.last_error && (
                    <p className="text-sm text-destructive">{t(`syncErrors.${source.last_error as "not_found"}`)}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={syncSourceNow}>
                    <input type="hidden" name="sourceId" value={source.id} />
                    <Button type="submit" variant="outline" aria-label={`${t("syncNow")}: ${label}`}>
                      {t("syncNow")}
                    </Button>
                  </form>
                  <form action={setSourceActive}>
                    <input type="hidden" name="sourceId" value={source.id} />
                    <input type="hidden" name="active" value={source.active ? "false" : "true"} />
                    <Button type="submit" variant="ghost" aria-label={`${source.active ? t("pause") : t("resume")}: ${label}`}>
                      {source.active ? t("pause") : t("resume")}
                    </Button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
