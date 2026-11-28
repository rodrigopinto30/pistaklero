"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Field, useFocusFirstError, valueOf } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { NativeSelect } from "@/components/ui/native-select";
import { createPost, type PostFormState, updatePost } from "@/lib/posts/actions";
import { TagInput } from "./tag-input";
import type { FormState } from "@/lib/forms";
import { RichTextarea } from "@/components/editor/rich-textarea";
import { RichTitleInput } from "@/components/editor/rich-title-input";

type Saved = { id?: string; title: string; body: string; language: string; tags?: string[] };

/** Escribir o editar una publicación. El título y el texto tienen formato (editor visual). */
export function PostForm({ locale, saved }: { locale: string; saved?: Saved }) {
  const t = useTranslations("Posts.form");
  const tErrors = useTranslations("Posts.errors");
  const [state, action] = useActionState<PostFormState, FormData>(saved?.id ? updatePost : createPost, { status: "idle" });
  const formState: FormState = state.status === "post_error" ? { status: "error", fieldErrors: {}, values: state.values } : state;
  const formRef = useFocusFirstError(formState);
  const errors = formState.status === "error" ? formState.fieldErrors : {};
  const v = (name: Exclude<keyof Saved, "tags">, fallback = "") => valueOf(formState, name, saved?.[name] ?? fallback);

  return (
    <form ref={formRef} action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      {saved?.id && <input type="hidden" name="id" value={saved.id} />}
      {state.status === "post_error" && (
        <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {tErrors(state.code)}
        </p>
      )}
      <Field id="post-title" name="title" label={t("title")} required hint={t("titleHint")} error={errors.title}>
        {(p) => <RichTitleInput {...p} maxLength={120} defaultValue={v("title")} />}
      </Field>
      <Field id="post-language" name="language" label={t("language")} required error={errors.language} className="sm:max-w-xs">
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
      <Field id="post-body" name="body" label={t("body")} required hint={t("bodyHint")} error={errors.body}>
        {(p) => <RichTextarea {...p} maxLength={5000} className="min-h-64" defaultValue={v("body")} />}
      </Field>
      <TagInput name="tags" initial={saved?.tags ?? []} />
      <p className="text-sm text-muted-foreground">{t("public")}</p>
      <SubmitButton label={saved?.id ? t("save") : t("publish")} />
    </form>
  );
}
