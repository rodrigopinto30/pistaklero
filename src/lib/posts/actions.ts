"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth/session";
import { flash } from "@/lib/flash.server";
import { errorState, type FormState, formValues, zodFieldErrors } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { POST_REPORT_REASONS, postSchema } from "@/lib/validation/post";
import { redirect } from "@/i18n/navigation";
import { parseLocale } from "@/i18n/locale";

const POST_ERRORS = ["no_person", "rate_limited", "not_found", "not_authorized"] as const;
export type PostError = (typeof POST_ERRORS)[number] | "unknown";
export type PostFormState = FormState | { status: "post_error"; code: PostError; values: Record<string, string> };

const postError = (message: string | undefined): PostError => POST_ERRORS.find((code) => code === message) ?? "unknown";

/** Publica al instante. La base pide datos personales, limita a 5 por día y arma el slug. */
export async function createPost(_prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const values = formValues(formData);
  const locale = parseLocale(values.locale);
  const parsed = postSchema.safeParse(values);
  if (!parsed.success) return errorState(values, zodFieldErrors(parsed.error));

  const supabase = await createClient();
  const { data: slug, error } = await supabase.rpc("create_post", {
    p_title: parsed.data.title,
    p_body: parsed.data.body,
    p_language: parsed.data.language,
  });
  if (error || !slug) {
    const code = postError(error?.message);
    if (code === "unknown") console.error("No se pudo publicar", { code: error?.code, message: error?.message });
    return { status: "post_error", code, values };
  }

  await flash("postPublished");
  return redirect({ href: { pathname: "/posts/[slug]", params: { slug } }, locale });
}

export async function updatePost(_prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const values = formValues(formData);
  const locale = parseLocale(values.locale);
  const id = z.uuid().safeParse(values.id);
  const parsed = postSchema.safeParse(values);
  if (!id.success) return { status: "post_error", code: "not_found", values };
  if (!parsed.success) return errorState(values, zodFieldErrors(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_post", {
    p_post_id: id.data,
    p_title: parsed.data.title,
    p_body: parsed.data.body,
    p_language: parsed.data.language,
  });
  if (error) return { status: "post_error", code: postError(error.message), values };

  const { data: post } = await supabase.from("posts").select("slug").eq("id", id.data).single();
  await flash("saved");
  return redirect({ href: { pathname: "/posts/[slug]", params: { slug: post!.slug } }, locale });
}

export async function deletePost(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("id"));
  const locale = parseLocale(formData.get("locale"));
  if (!id.success) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_post", { p_post_id: id.data });
  if (error) return;
  await flash("removed");
  const profile = await getCurrentProfile();
  redirect({ href: profile?.role === "admin" ? "/admin" : "/my-posts", locale });
}

export type ToggleResult = { status: "on" | "off" } | { status: "error"; code: "not_authorized" | "not_found" | "limit_reached" | "unknown" };

async function toggle(rpc: "toggle_post_like" | "toggle_saved_post", postId: string): Promise<ToggleResult> {
  const id = z.uuid().safeParse(postId);
  if (!id.success) return { status: "error", code: "unknown" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(rpc, { p_post_id: id.data });
  if (error) {
    const code = (["not_authorized", "not_found", "limit_reached"] as const).find((c) => c === error.message) ?? "unknown";
    return { status: "error", code };
  }
  refresh();
  return { status: data ? "on" : "off" };
}

export async function togglePostLike(postId: string) {
  return toggle("toggle_post_like", postId);
}

export async function toggleSavedPost(postId: string) {
  return toggle("toggle_saved_post", postId);
}

export async function reportPost(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const id = z.uuid().safeParse(values.postId);
  const reason = z.enum(POST_REPORT_REASONS).safeParse(values.reason);
  if (!id.success) return errorState(values, {}, "unknown");
  if (!reason.success) return errorState(values, { reason: { code: "required" } });

  const supabase = await createClient();
  const { error } = await supabase.rpc("report_post", { p_post_id: id.data, p_reason: reason.data });
  if (error) return errorState(values, {}, "not_found");
  return { status: "success", savedAt: Date.now() };
}

/** Admin: vuelve a publicar una publicación oculta por denuncias. */
export async function restorePost(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.rpc("admin_restore_post", { p_post_id: id.data });
  await flash("done");
  refresh();
}
