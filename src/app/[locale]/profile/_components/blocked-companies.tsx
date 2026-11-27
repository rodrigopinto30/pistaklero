"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { blockCompany, type CompanySearchState, searchCompaniesToBlock, unblockCompany } from "../actions";
import { SubmitButton } from "@/components/forms/submit-button";

const initialSearch: CompanySearchState = { status: "idle" };

export function BlockedCompanies({ blocked }: { blocked: { id: string; name: string }[] }) {
  const t = useTranslations("Profile.blocked");
  const [search, searchAction] = useActionState(searchCompaniesToBlock, initialSearch);

  return (
    <div className="flex flex-col gap-4">
      {blocked.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {blocked.map((company) => (
            <li key={company.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
              <span>{company.name}</span>
              <form action={unblockCompany}>
                <input type="hidden" name="companyId" value={company.id} />
                <Button type="submit" variant="ghost" aria-label={t("unblock", { company: company.name })}>
                  {t("unblock", { company: "" }).trim()}
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {/* Rótulo arriba y campo + botón en la misma línea: quedan alineados en cualquier ancho. */}
      <form action={searchAction} role="search" className="flex flex-col gap-2">
        <Label htmlFor="block-search">{t("search")}</Label>
        <div className="flex gap-2">
          <Input id="block-search" name="query" type="search" minLength={2} maxLength={80} defaultValue={search.status === "results" ? search.query : ""} className="flex-1" />
          <SubmitButton label={t("searchButton")} variant="secondary" className="shrink-0" />
        </div>
      </form>

      <div role="status" className="empty:hidden">
        {search.status === "results" &&
          (search.companies.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noResults")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {search.companies.map((company) => (
                <li key={company.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                  <span>
                    {company.name}
                    {company.domain && <span className="ml-2 text-sm text-muted-foreground">{company.domain}</span>}
                  </span>
                  <form action={blockCompany}>
                    <input type="hidden" name="companyId" value={company.id} />
                    <Button type="submit" variant="destructive">
                      {t("block", { company: company.name })}
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          ))}
      </div>
    </div>
  );
}
