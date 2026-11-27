"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef } from "react";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { addImportSource, type SourceState } from "./actions";

const PROVIDERS = ["greenhouse", "lever", "ashby", "workable"] as const;

export function SourceForm() {
  const t = useTranslations("Import.sources");
  const [state, action] = useActionState<SourceState, FormData>(addImportSource, { status: "idle" });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "done") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="source-company">{t("companyName")}</Label>
        <Input id="source-company" name="companyName" required minLength={2} maxLength={80} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="source-website">{t("websiteUrl")}</Label>
        <Input id="source-website" name="websiteUrl" type="url" placeholder="https://" aria-describedby="source-website-hint" />
        <p id="source-website-hint" className="text-sm text-muted-foreground">
          {t("websiteHint")}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="source-provider">{t("provider")}</Label>
        <NativeSelect id="source-provider" name="provider" defaultValue="greenhouse">
          {PROVIDERS.map((provider) => (
            <option key={provider} value={provider}>
              {t(`providers.${provider}`)}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="source-token">{t("boardToken")}</Label>
        <Input id="source-token" name="boardToken" required pattern="[A-Za-z0-9_.\-]{1,100}" maxLength={100} aria-describedby="source-token-hint" />
        <p id="source-token-hint" className="text-sm text-muted-foreground">
          {t("boardTokenHint")}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <SubmitButton label={t("add")} />
        <p role="status" className="text-sm empty:hidden">
          {state.status === "done" && <span className="text-primary">{t("added")}</span>}
          {state.status === "error" && <span className="text-destructive">{t(`errors.${state.code as "unknown"}`)}</span>}
        </p>
      </div>
    </form>
  );
}
