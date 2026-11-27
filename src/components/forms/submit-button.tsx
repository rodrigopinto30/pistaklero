"use client";

import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitButton({ label, variant }: { label?: string; variant?: "default" | "outline" | "secondary" }) {
  const t = useTranslations("Form");
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} className="self-start">
      {pending ? t("saving") : (label ?? t("save"))}
    </Button>
  );
}
