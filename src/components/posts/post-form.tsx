"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Field, FieldGrid, useFocusFirstError, valueOf } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { createPost, type PostFormState, updatePost } from "@/lib/posts/actions";
import type { FormState } from "@/lib/forms";

type Saved = { id?: string; title: string; body: string; language: string };

/** Escribir o editar una publicación. El texto admite Markdown básico (negrita, listas, enlaces). */
export function PostForm({ locale, saved }: { locale: string; saved?: Saved }) {
  const t = useTranslations("Posts.form");
  const tErrors = useTranslations("Posts.errors");
  const [state, action] = useActionState<PostFormState, FormData>(saved?.id ? updatePost : createPost, { status: "idle" });
  const formState: FormState = state.status === "post_error" ? { status: "error", fieldErrors: {}, values: state.values } : state;
  const formRef = useFocusFirstError(formState);
  const errors = formState.status === "error" ? formState.fieldErrors : {};
  const v = (name: keyof Saved, fallback = "") => valueOf(formState, name, saved?.[name] ?? fallback);

  return (
    <form ref={formRef} action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      {saved?.id && <input type="hidden" name="id" value={saved.id} />}
      {state.status === "post_error" && (
        <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {tErrors(state.code)}
        </p>
      )}
      <FieldGrid className="sm:grid-cols-[1fr_12rem]">
        <Field id="post-title" name="title" label={t("title")} required hint={t("titleHint")} error={errors.title}>
          {(p) => <Input {...p} maxLength={120} defaultValue={v("title")} />}
        </Field>
        <Field id="post-language" name="language" label={t("language")} required error={errors.language}>
          {(p) => (
            <NativeSelect {...p} defaultValue={v("language", locale)}>
              <option value="es" lang="es">
                Español
              </option>
              <option value="en" lang="en">
                English
              </option>
            </NativeSelect>
          )}
        </Field>
      </FieldGrid>
      <Field id="post-body" name="body" label={t("body")} required hint={t("bodyHint")} error={errors.body}>
        {(p) => <Textarea {...p} maxLength={5000} className="min-h-64" defaultValue={v("body")} />}
      </Field>
      <p className="text-sm text-muted-foreground">{t("public")}</p>
      <SubmitButton label={saved?.id ? t("save") : t("publish")} />
    </form>
  );
}
