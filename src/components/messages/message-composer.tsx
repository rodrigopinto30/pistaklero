"use client";

import { useTranslations } from "next-intl";
import { type KeyboardEvent, useActionState, useEffect, useRef } from "react";
import { EmojiButton } from "@/components/editor/emoji-button";
import { Button } from "@/components/ui/button";
import type { MessageFormState } from "@/lib/messages/actions";

/**
 * El cuadro para escribir. Enter envía y Mayús+Enter agrega una línea. Si falla, el texto queda
 * escrito y el error se anuncia (WCAG 4.1.3). `onSent` avisa para traer el mensaje recién mandado.
 */
export function MessageComposer({
  action,
  hidden,
  disabled = false,
  onSent,
}: {
  action: (prev: MessageFormState, formData: FormData) => Promise<MessageFormState>;
  hidden: Record<string, string>;
  disabled?: boolean;
  onSent?: () => void;
}) {
  const t = useTranslations("Messages");
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  const textarea = useRef<HTMLTextAreaElement>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "sent") {
      if (textarea.current) textarea.current.value = "";
      onSent?.();
    }
    if (state.status === "error" && textarea.current) {
      textarea.current.value = state.body;
      textarea.current.focus();
    }
  }, [state, onSent]);

  // El emoji va donde está el cursor.
  const insertEmoji = (emoji: string) => {
    const element = textarea.current;
    if (!element) return;
    const start = element.selectionStart ?? element.value.length;
    element.setRangeText(emoji, start, element.selectionEnd ?? start, "end");
    element.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      form.current?.requestSubmit();
    }
  };

  return (
    <form ref={form} action={formAction} className="flex flex-col gap-2">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <label htmlFor="message-body" className="sr-only">
        {t("composer")}
      </label>
      <div className="flex items-end gap-2 rounded-2xl bg-card p-2 shadow-soft focus-within:shadow-soft-lg">
        <EmojiButton onSelect={insertEmoji} />
        <textarea
          ref={textarea}
          id="message-body"
          name="body"
          rows={2}
          maxLength={2000}
          required
          disabled={disabled}
          placeholder={t("composer")}
          aria-describedby="message-hint message-error"
          aria-invalid={state.status === "error" || undefined}
          onKeyDown={onKeyDown}
          className="max-h-48 min-h-11 flex-1 resize-y bg-transparent px-2 py-2.5 text-base outline-none placeholder:text-muted-foreground md:text-sm"
        />
        <Button type="submit" disabled={pending || disabled}>
          {pending ? t("sending") : t("send")}
        </Button>
      </div>
      <p id="message-hint" className="text-xs text-muted-foreground">
        {t("composerHint")}
      </p>
      <p id="message-error" role="alert" className="text-sm text-destructive empty:hidden">
        {state.status === "error" ? t(`errors.${state.code}`) : ""}
      </p>
    </form>
  );
}
