"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { scheduleOutboxFlush } from "@/lib/email/outbox";
import { flash } from "@/lib/flash.server";
import { normalizeNewlines } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { parseLocale } from "@/i18n/locale";

export type MessageErrorCode = "request_pending" | "rate_limited" | "not_available" | "invalid_body" | "account_changed" | "unknown";
export type MessageFormState = { status: "idle" } | { status: "sent"; at: number } | { status: "error"; code: MessageErrorCode; body: string };

const KNOWN: MessageErrorCode[] = ["request_pending", "rate_limited", "not_available", "invalid_body"];
const errorCode = (message?: string): MessageErrorCode => KNOWN.find((code) => code === message) ?? "unknown";
const body = z.string().trim().min(1).max(2000);

/**
 * ¿La sesión sigue siendo la de la cuenta con la que se abrió la pestaña (campo "account")? En un
 * mismo navegador, entrar con otra cuenta en otra pestaña cambia la sesión de todas: sin esto, el
 * mensaje salía firmado por la otra cuenta.
 */
async function sameAccount(supabase: Awaited<ReturnType<typeof createClient>>, formData: FormData) {
  const expected = formData.get("account");
  if (typeof expected !== "string" || !expected) return true;
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub === expected;
}

/** Un mensaje en una conversación existente. */
export async function sendMessage(_prev: MessageFormState, formData: FormData): Promise<MessageFormState> {
  const raw = normalizeNewlines(String(formData.get("body") ?? ""));
  const id = z.uuid().safeParse(formData.get("conversationId"));
  const text = body.safeParse(raw);
  if (!id.success) return { status: "error", code: "unknown", body: raw };
  if (!text.success) return { status: "error", code: "invalid_body", body: raw };

  const supabase = await createClient();
  if (!(await sameAccount(supabase, formData))) return { status: "error", code: "account_changed", body: raw };
  const { error } = await supabase.rpc("post_message", { p_conversation_id: id.data, p_body: text.data });
  if (error) return { status: "error", code: errorCode(error.message), body: raw };
  scheduleOutboxFlush();
  refresh();
  return { status: "sent", at: Date.now() };
}

/** El primer mensaje a alguien: arranca la conversación (o usa la que ya tengan) y va a ella. */
export async function startConversation(_prev: MessageFormState, formData: FormData): Promise<MessageFormState> {
  const raw = normalizeNewlines(String(formData.get("body") ?? ""));
  const to = z.uuid().safeParse(formData.get("to"));
  const locale = parseLocale(formData.get("locale"));
  const text = body.safeParse(raw);
  if (!to.success) return { status: "error", code: "unknown", body: raw };
  if (!text.success) return { status: "error", code: "invalid_body", body: raw };

  const supabase = await createClient();
  if (!(await sameAccount(supabase, formData))) return { status: "error", code: "account_changed", body: raw };
  const { data: id, error } = await supabase.rpc("start_conversation", { p_recipient: to.data, p_body: text.data });
  if (error || !id) return { status: "error", code: errorCode(error?.message), body: raw };
  scheduleOutboxFlush();
  redirect({ href: { pathname: "/messages/[id]", params: { id } }, locale });
  return { status: "sent", at: Date.now() };
}

/** Aceptar o ignorar una solicitud. Ignorada, vuelve a la bandeja (quien escribió no se entera). */
export async function answerRequest(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("conversationId"));
  const accept = formData.get("accept") === "1";
  const locale = parseLocale(formData.get("locale"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.rpc("answer_conversation_request", { p_conversation_id: id.data, p_accept: accept });
  refresh();
  if (!accept) {
    await flash("requestIgnored");
    redirect({ href: { pathname: "/messages", query: { caja: "solicitudes" } }, locale });
  }
}

export async function blockUser(formData: FormData) {
  const user = z.uuid().safeParse(formData.get("userId"));
  const locale = parseLocale(formData.get("locale"));
  if (!user.success) return;
  const supabase = await createClient();
  await supabase.rpc("block_user", { p_user_id: user.data });
  await flash("userBlocked");
  refresh();
  redirect({ href: "/messages", locale });
}

export async function unblockUser(formData: FormData) {
  const user = z.uuid().safeParse(formData.get("userId"));
  if (!user.success) return;
  const supabase = await createClient();
  await supabase.rpc("unblock_user", { p_user_id: user.data });
  await flash("userUnblocked");
  refresh();
}

export async function reportMessage(_prev: { status: "idle" | "done" | "error" }, formData: FormData): Promise<{ status: "idle" | "done" | "error" }> {
  const id = z.uuid().safeParse(formData.get("messageId"));
  const reason = z.enum(["spam", "scam", "offensive", "other"]).safeParse(formData.get("reason"));
  if (!id.success || !reason.success) return { status: "error" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_message", { p_message_id: id.data, p_reason: reason.data });
  return { status: error ? "error" : "done" };
}

/** Marca la conversación como leída (al abrirla o al llegar mensajes con la pestaña a la vista). */
export async function markConversationRead(conversationId: string) {
  const id = z.uuid().safeParse(conversationId);
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.rpc("mark_conversation_read", { p_conversation_id: id.data });
}

/** Qué hace Enter al escribir un mensaje: enviar (true) o pasar al siguiente renglón. Queda en la cuenta. */
export async function setMessageEnterSends(enterSends: boolean) {
  const value = z.boolean().safeParse(enterSends);
  if (!value.success) return;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return;
  await supabase.from("profiles").update({ message_enter_sends: value.data }).eq("id", userId);
}
