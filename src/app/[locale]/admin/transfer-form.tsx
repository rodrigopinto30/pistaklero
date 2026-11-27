"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { transferCompany, type TransferState } from "./actions";

export function TransferForm({ companyId, companyName }: { companyId: string; companyName: string }) {
  const t = useTranslations("Admin.unclaimed");
  const [state, action] = useActionState<TransferState, FormData>(transferCompany, { status: "idle" });
  const id = `transfer-${companyId}`;

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="companyId" value={companyId} />
      <div className="flex flex-col gap-2">
        <Label htmlFor={id}>{t("transferTo", { company: companyName })}</Label>
        <Input id={id} name="email" type="email" required className="w-64" aria-describedby={`${id}-status`} />
      </div>
      <SubmitButton label={t("transfer")} variant="secondary" />
      <p id={`${id}-status`} role="status" className="w-full text-sm empty:hidden">
        {state.status === "done" && <span className="text-primary">{t("transferred")}</span>}
        {state.status === "error" && <span className="text-destructive">{t(`errors.${state.code as "user_not_found"}`)}</span>}
      </p>
    </form>
  );
}
