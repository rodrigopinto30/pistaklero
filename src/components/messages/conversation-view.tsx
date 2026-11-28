"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { MESSAGES_READ_EVENT } from "@/components/header/messages-link";
import { sendMessage } from "@/lib/messages/actions";
import { cn } from "@/lib/utils";
import { useRouter } from "@/i18n/navigation";
import { MESSAGES_CHANGED_EVENT } from "./app-screen";
import { MessageComposer } from "./message-composer";
import { MessageTicks, type Receipts, statusOf } from "./message-ticks";
import { ReportMessage } from "./report-message";

type Message = { id: string; body: string; created_at: string; mine: boolean };

/** Marca la conversación como leída y avisa al ícono de mensajes (sale aunque se cierre la vista). */
async function markRead(conversationId: string) {
  try {
    await fetch(`/api/me/messages/${conversationId}/read`, { method: "POST", keepalive: true });
    window.dispatchEvent(new Event(MESSAGES_READ_EVENT));
  } catch {
    // Sin conexión: se marca la próxima vez.
  }
}
type Href = Parameters<ReturnType<typeof useRouter>["push"]>[0];

/**
 * ¿Hay algo abierto que se cierra con Escape (un menú, el selector de emojis, un diálogo)? Entonces
 * Escape cierra eso y no la conversación. Se mira antes de que ellos reaccionen. Las ayudas al pasar
 * el mouse no cuentan: se cierran igual, junto con la conversación.
 */
function popupOpen() {
  // Los <dialog> nativos (confirmar, búsqueda rápida) están siempre en la página: cuentan solo abiertos.
  return Boolean(
    document.querySelector('dialog[open], [role="dialog"]:not(dialog), [role="alertdialog"]:not(dialog), [role="menu"], [role="listbox"]')
  );
}

/**
 * Una conversación abierta: los mensajes (role="log": los nuevos se anuncian sin interrumpir) y el
 * cuadro para escribir. Ocupa todo el alto disponible: los mensajes se desplazan y el cuadro queda
 * abajo. Los propios van a la derecha y los de la otra persona a la izquierda (y cada uno dice de
 * quién es, para los lectores de pantalla). Trae los nuevos cada 4 segundos con la pestaña a la vista.
 * Escape cierra la conversación (como WhatsApp Web); lo escrito queda guardado como borrador.
 * Los míos llevan tildes (enviado, entregado, leído), que se ponen al día con cada vuelta.
 */
export function ConversationView({
  conversationId,
  otherName,
  initialMessages,
  initialReceipts,
  canWrite,
  enterSends,
  closeHref,
}: {
  conversationId: string;
  otherName: string;
  initialMessages: Message[];
  initialReceipts: Receipts;
  canWrite: boolean;
  enterSends: boolean;
  closeHref: Href;
}) {
  const t = useTranslations("Messages");
  const format = useFormatter();
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [receipts, setReceipts] = useState(initialReceipts);
  const log = useRef<HTMLDivElement>(null);
  const last = messages.at(-1)?.created_at;

  const poll = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const query = last ? `?after=${encodeURIComponent(last)}` : "";
      const response = await fetch(`/api/me/messages/${conversationId}${query}`, { cache: "no-store" });
      const { messages: fresh, receipts: latest } = (await response.json()) as { messages: Message[]; receipts: Receipts };
      // Las tildes cambian aunque no haya mensajes nuevos (la otra persona leyó): la lista también.
      if (latest?.delivered_at !== receipts?.delivered_at || latest?.read_at !== receipts?.read_at) {
        setReceipts(latest);
        window.dispatchEvent(new Event(MESSAGES_CHANGED_EVENT));
      }
      if (fresh.length === 0) return;
      setMessages((current) => [...current, ...fresh.filter((m) => !current.some((c) => c.id === m.id))]);
      if (fresh.some((m) => !m.mine)) {
        await markRead(conversationId);
        // La lista de conversaciones muestra lo último.
        window.dispatchEvent(new Event(MESSAGES_CHANGED_EVENT));
      }
    } catch {
      // Sin conexión: se reintenta en la próxima vuelta.
    }
  }, [conversationId, last, receipts]);

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
    void markRead(conversationId);
  }, [conversationId]);
  useEffect(() => {
    const element = log.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages.length]);

  // Escape cierra la conversación (en la fase de captura: antes de que un menú abierto lo use).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing || popupOpen()) return;
      router.push(closeHref);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [router, closeHref]);

  // El estado escrito va en el último mensaje mío (vale para todos los anteriores).
  const lastMine = messages.findLast((m) => m.mine)?.id;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div
        ref={log}
        role="log"
        aria-label={t("logLabel", { name: otherName })}
        tabIndex={0}
        className="min-h-32 flex-1 overflow-y-auto overscroll-contain rounded-2xl bg-muted/40 p-4"
      >
        <ol className="flex flex-col gap-3">
          {messages.map((message) => (
            <li key={message.id} data-mine={message.mine || undefined} className={cn("flex max-w-[85%] flex-col gap-1", message.mine ? "items-end self-end" : "items-start self-start")}>
              <p
                className={cn(
                  "rounded-2xl px-4 py-2.5 text-sm break-words whitespace-pre-wrap",
                  message.mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-card shadow-soft"
                )}
              >
                <span className="sr-only">{message.mine ? t("youSaid") : t("theySaid", { name: otherName })} </span>
                {message.body}
              </p>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <time dateTime={message.created_at}>{format.dateTime(new Date(message.created_at), { dateStyle: "short", timeStyle: "short" })}</time>
                {message.mine && <MessageTicks status={statusOf(message.created_at, receipts)} label={message.id === lastMine} />}
                {!message.mine && <ReportMessage messageId={message.id} />}
              </span>
            </li>
          ))}
        </ol>
      </div>
      {canWrite && (
        <MessageComposer
          action={sendMessage}
          hidden={{ conversationId }}
          onSent={poll}
          enterSends={enterSends}
          draftKey={conversationId}
          extraHint={t("escapeHint")}
        />
      )}
    </div>
  );
}
