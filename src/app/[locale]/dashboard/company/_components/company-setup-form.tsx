"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, startTransition, useActionState } from "react";
import { Emoji } from "@/components/emoji";
import { Field, FieldGrid, FormMessage, useFocusFirstError, valueOf } from "@/components/forms/field";
import { ImagePicker } from "@/components/forms/image-picker";
import { SkillChips } from "@/components/forms/skill-chips";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { idleState } from "@/lib/forms";
import { COMPANY_SIZES, COMPANY_STAGES, COVER_MAX_BYTES, LOGO_MAX_BYTES } from "@/lib/validation/company";
import { completeCompanySetup } from "../actions";
import type { CompanyDetailsValues } from "./details-form";
import { IndustryField } from "./industry-field";
import { RichTextarea } from "@/components/editor/rich-textarea";

type Props = {
  locale: string;
  saved: CompanyDetailsValues & { websiteUrl: string };
  countries: { code: string; name: string }[];
  catalog: { id: string; name: string }[];
};

/**
 * Alta de la empresa: todo en un solo formulario, uno debajo del otro (logo, portada, datos, web,
 * stack) y un único "Finalizar registro". Los botones de guardar por sección aparecen recién
 * después, para editar.
 * Se envía a mano (sin el reinicio automático de React): si algo falla, nada de lo elegido se pierde,
 * tampoco las imágenes.
 */
export function CompanySetupForm({ locale, saved, countries, catalog }: Props) {
  const t = useTranslations("Company");
  const td = useTranslations("Company.details");
  const [state, action, pending] = useActionState(completeCompanySetup, idleState);
  const formRef = useFocusFirstError(state);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const v = (name: keyof Props["saved"]) => valueOf(state, name, saved[name]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  };

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />

      <SectionCard id="setup-images" title={t("setup.images")} description={t("setup.imagesHint")}>
        <div className="flex flex-col gap-6">
          <ImagePicker name="logo" label={t("logo.file")} hint={t("logo.hint")} shape="square" maxBytes={LOGO_MAX_BYTES} error={errors.logo ? t("setup.imageError") : null} />
          <ImagePicker name="cover" label={t("cover.file")} hint={t("cover.hint")} shape="wide" maxBytes={COVER_MAX_BYTES} error={errors.cover ? t("setup.imageError") : null} />
        </div>
      </SectionCard>

      <SectionCard id="setup-details" title={t("details.title")}>
        <div className="flex flex-col gap-4">
          <Field id="setup-name" name="name" label={td("name")} required error={errors.name}>
            {(p) => <Input {...p} autoComplete="organization" maxLength={80} defaultValue={v("name")} />}
          </Field>
          <Field id="setup-description" name="description" label={td("description")} hint={td("descriptionHint")} error={errors.description}>
            {(p) => <RichTextarea {...p} className="min-h-40" maxLength={2000} defaultValue={v("description")} />}
          </Field>
          <IndustryField idPrefix="setup" saved={v("industry")} error={errors.industry} />
          <FieldGrid>
            <Field id="setup-size" name="size" label={td("size")} error={errors.size}>
              {(p) => (
                <NativeSelect {...p} defaultValue={v("size")}>
                  <option value="">{td("noValue")}</option>
                  {COMPANY_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {td(`sizeOptions.${size}`)}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </Field>
            <Field id="setup-stage" name="stage" label={td("stage")} error={errors.stage}>
              {(p) => (
                <NativeSelect {...p} defaultValue={v("stage")}>
                  <option value="">{td("noValue")}</option>
                  {COMPANY_STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {td(`stageOptions.${stage}`)}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </Field>
            <Field id="setup-country" name="country" label={td("country")} error={errors.country}>
              {(p) => (
                <NativeSelect {...p} defaultValue={v("country")}>
                  <option value="">{td("noValue")}</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </Field>
            <Field id="setup-city" name="city" label={td("city")} error={errors.city}>
              {(p) => <Input {...p} maxLength={80} defaultValue={v("city")} />}
            </Field>
          </FieldGrid>
        </div>
      </SectionCard>

      <SectionCard id="setup-web" title={t("setup.web")}>
        <div className="flex flex-col gap-4">
          <Field id="setup-websiteUrl" name="websiteUrl" label={t("website.websiteUrl")} hint={t("setup.websiteHint")} error={errors.websiteUrl}>
            {(p) => <Input {...p} type="url" inputMode="url" defaultValue={v("websiteUrl")} />}
          </Field>
          {(["linkedinUrl", "xUrl", "instagramUrl"] as const).map((name) => (
            <Field key={name} id={`setup-${name}`} name={name} label={td(name)} error={errors[name]}>
              {(p) => <Input {...p} type="url" inputMode="url" defaultValue={v(name)} />}
            </Field>
          ))}
        </div>
      </SectionCard>

      <SectionCard id="setup-stack" title={t("setup.stack")} description={t("stack.hint")}>
        <SkillChips name="skillIds" label={t("stack.skill")} catalog={catalog} />
      </SectionCard>

      <FormMessage state={state} />
      <Button type="submit" size="lg" disabled={pending} className="self-stretch sm:self-start">
        {pending ? t("setup.submitting") : t("setup.submit")}
        {!pending && <Emoji symbol="🎉" />}
      </Button>
    </form>
  );
}
