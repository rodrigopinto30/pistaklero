"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { MESSAGES_READ_EVENT } from "@/components/header/messages-link";
import { markConversationRead, sendMessage } from "@/lib/messages/actions";
import { cn } from "@/lib/utils";
import { MessageComposer } from "./message-composer";
import { ReportMessage } from "./report-message";

type Message = { id: string; body: string; created_at: string; mine: boolean };

/**
 * Una conversación abierta: los mensajes (role="log": los nuevos se anuncian sin interrumpir) y el
 * cuadro para escribir. Trae los mensajes nuevos cada 4 segundos mientras la pestaña está a la vista.
 */
export function ConversationView({
  conversationId,
  otherName,
  initialMessages,
  canWrite,
}: {
  conversationId: string;
  otherName: string;
  initialMessages: Message[];
  canWrite: boolean;
}) {
  const t = useTranslations("Messages");
  const format = useFormatter();
  const [messages, setMessages] = useState(initialMessages);
  const log = useRef<HTMLDivElement>(null);
  const last = messages.at(-1)?.created_at;

  const poll = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const query = last ? `?after=${encodeURIComponent(last)}` : "";
      const response = await fetch(`/api/me/messages/${conversationId}${query}`, { cache: "no-store" });
      const { messages: fresh } = (await response.json()) as { messages: Message[] };
      if (fresh.length === 0) return;
      setMessages((current) => [...current, ...fresh.filter((m) => !current.some((c) => c.id === m.id))]);
      if (fresh.some((m) => !m.mine)) {
        await markConversationRead(conversationId);
        window.dispatchEvent(new Event(MESSAGES_READ_EVENT));
      }
    } catch {
      // Sin conexión: se reintenta en la próxima vuelta.
    }
  }, [conversationId, last]);

  useEffect(() => {
    const timer = setInterval(poll, 4000);
    document.addEventListener("visibilitychange", poll);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [poll]);

  // Al abrirla queda leída; y siempre se ve lo último.
  useEffect(() => {
    void markConversationRead(conversationId).then(() => window.dispatchEvent(new Event(MESSAGES_READ_EVENT)));
  }, [conversationId]);
  useEffect(() => {
    const element = log.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages.length]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div ref={log} role="log" aria-label={t("logLabel", { name: otherName })} tabIndex={0} className="max-h-[60dvh] min-h-64 overflow-y-auto rounded-2xl bg-muted/40 p-4">
      <ol className="flex flex-col gap-3">
        {messages.map((message) => (
          <li key={message.id} className={cn("flex max-w-[85%] flex-col gap-1", message.mine ? "self-end items-end" : "self-start items-start")}>
            <p
              className={cn(
                "rounded-2xl px-4 py-2.5 text-sm break-words whitespace-pre-wrap",
                message.mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-card shadow-soft"
              )}
            >
              {message.body}
            </p>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <time dateTime={message.created_at}>{format.dateTime(new Date(message.created_at), { dateStyle: "short", timeStyle: "short" })}</time>
              {!message.mine && <ReportMessage messageId={message.id} />}
            </span>
          </li>
        ))}
      </ol>
      </div>
      {canWrite && <MessageComposer action={sendMessage} hidden={{ conversationId }} onSent={poll} />}
    </div>
  );
}
