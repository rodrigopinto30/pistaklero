"use client";

import { Menu } from "@base-ui/react/menu";
import { Check, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { type KeyboardEvent, useActionState, useEffect, useRef, useState } from "react";
import { useAccountId } from "@/components/account/account-context";
import { EmojiButton } from "@/components/editor/emoji-button";
import { Tip } from "@/components/tip";
import { buttonVariants } from "@/components/ui/button";
import { type MessageFormState, setMessageEnterSends } from "@/lib/messages/actions";
import { cn } from "@/lib/utils";

/** Alto máximo del cuadro (después aparece su propio scroll), en px: unas 8 líneas. */
const MAX_HEIGHT = 192;

const itemClass =
  "flex cursor-default items-start gap-3 rounded-xl px-3 py-2.5 text-sm outline-none select-none data-highlighted:bg-muted";

/**
 * El cuadro para escribir: el emoji, el texto y "Enviar", centrados en una línea; el texto crece al
 * escribir. "Enviar" queda inactivo sin texto. Su flechita elige qué hace Enter (enviar o pasar al
 * siguiente renglón) y la elección queda guardada en la cuenta. Ctrl+Enter (⌘+Enter) siempre envía.
 * Si falla, el texto queda escrito y el error se anuncia (WCAG 4.1.3). `onSent` avisa para traer el
 * mensaje recién mandado. Con `draftKey`, lo que se estaba escribiendo sobrevive a cerrar la
 * conversación (por ejemplo con Escape) mientras la pestaña siga abierta.
 */
export function MessageComposer({
  action,
  hidden,
  disabled = false,
  onSent,
  enterSends: savedEnterSends = true,
  draftKey,
  extraHint,
}: {
  action: (prev: MessageFormState, formData: FormData) => Promise<MessageFormState>;
  hidden: Record<string, string>;
  disabled?: boolean;
  onSent?: () => void;
  enterSends?: boolean;
  draftKey?: string;
  extraHint?: string;
}) {
  const t = useTranslations("Messages");
  const account = useAccountId();
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  const [enterSends, setEnterSends] = useState(savedEnterSends);
  const [hasText, setHasText] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const storageKey = draftKey ? `pistaklero:draft:${draftKey}` : null;

  // El alto sigue al texto (hasta MAX_HEIGHT), y el estado de "Enviar" también.
  const sync = () => {
    const element = textarea.current;
    if (!element) return;
    setHasText(element.value.trim().length > 0);
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT)}px`;
  };

  const saveDraft = (value: string) => {
    if (!storageKey) return;
    try {
      if (value) sessionStorage.setItem(storageKey, value);
      else sessionStorage.removeItem(storageKey);
    } catch {
      // Sin almacenamiento: el borrador no sobrevive, nada más.
    }
  };

  // Al cargar: lo que se escribió antes de que la página terminara de cargar cuenta; si no hay nada,
  // vuelve el borrador. Se avisa con "input", como si se tipeara.
  useEffect(() => {
    const element = textarea.current;
    if (!element) return;
    if (!element.value && storageKey) {
      try {
        element.value = sessionStorage.getItem(storageKey) ?? "";
      } catch {
        // Ídem.
      }
    }
    if (element.value) element.dispatchEvent(new Event("input", { bubbles: true }));
  }, [storageKey]);

  useEffect(() => {
    const element = textarea.current;
    if (!element) return;
    if (state.status === "sent") {
      // El "input" deja "Enviar" inactivo, el cuadro en una línea y el borrador vacío.
      element.value = "";
      element.dispatchEvent(new Event("input", { bubbles: true }));
      onSent?.();
    }
    if (state.status === "error") {
      element.value = state.body;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.focus();
    }
  }, [state, onSent]);

  // El emoji va donde está el cursor.
  const insertEmoji = (emoji: string) => {
    const element = textarea.current;
    if (!element) return;
    const start = element.selectionStart ?? element.value.length;
    element.setRangeText(emoji, start, element.selectionEnd ?? start, "end");
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    const send = event.ctrlKey || event.metaKey || (enterSends && !event.shiftKey);
    if (!send) return; // nuevo renglón
    event.preventDefault();
    if (hasText && !pending) form.current?.requestSubmit();
  };

  const chooseEnter = (value: string) => {
    const next = value === "send";
    setEnterSends(next);
    void setMessageEnterSends(next);
    textarea.current?.focus();
  };

  const inactive = !hasText || disabled;

  return (
    <form ref={form} action={formAction} className="flex flex-col gap-1.5">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {account && <input type="hidden" name="account" value={account} />}
      <label htmlFor="message-body" className="sr-only">
        {t("composer")}
      </label>
      <div className="flex items-center gap-2 rounded-2xl bg-card p-2 shadow-soft focus-within:shadow-soft-lg">
        <EmojiButton onSelect={insertEmoji} />
        <textarea
          ref={textarea}
          id="message-body"
          name="body"
          rows={1}
          maxLength={2000}
          required
          disabled={disabled}
          placeholder={t("composer")}
          aria-describedby="message-hint message-error"
          aria-invalid={state.status === "error" || undefined}
          onKeyDown={onKeyDown}
          onInput={(event) => {
            sync();
            saveDraft(event.currentTarget.value);
          }}
          style={{ maxHeight: MAX_HEIGHT }}
          className="min-h-10 flex-1 resize-none self-center bg-transparent px-2 py-2 text-base leading-6 outline-none placeholder:text-muted-foreground md:text-sm md:leading-6"
        />
        {/* "Enviar" y su flechita: un solo botón partido en dos, como en Gmail. */}
        <div className="flex shrink-0 items-center">
          <button
            type="submit"
            disabled={pending}
            aria-disabled={inactive || undefined}
            onClick={(event) => {
              if (inactive) event.preventDefault();
            }}
            className={cn(buttonVariants(), "rounded-r-none pr-3", inactive && "cursor-not-allowed opacity-50")}
          >
            {pending ? t("sending") : t("send")}
          </button>
          <Menu.Root>
            <Tip label={t("sendOptions")}>
              <Menu.Trigger
                aria-label={t("sendOptions")}
                className={cn(buttonVariants({ size: "icon" }), "w-9 rounded-l-none border-l border-primary-foreground/25")}
              >
                <ChevronUp aria-hidden="true" />
              </Menu.Trigger>
            </Tip>
            <Menu.Portal>
              <Menu.Positioner side="top" align="end" sideOffset={8} className="z-50 outline-none">
                <Menu.Popup className="w-72 origin-[var(--transform-origin)] rounded-2xl bg-popover p-2 text-popover-foreground shadow-soft-lg outline-none transition-[scale,opacity] duration-150 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
                  <Menu.Group>
                    <Menu.GroupLabel className="px-3 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">{t("enterLabel")}</Menu.GroupLabel>
                    <Menu.RadioGroup value={enterSends ? "send" : "newline"} onValueChange={chooseEnter}>
                      {(["send", "newline"] as const).map((value) => (
                        <Menu.RadioItem key={value} value={value} closeOnClick className={itemClass}>
                          <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                            <Menu.RadioItemIndicator>
                              <Check aria-hidden="true" className="size-4" />
                            </Menu.RadioItemIndicator>
                          </span>
                          <span className="flex flex-col">
                            <span className="font-medium">{t(value === "send" ? "enterSends" : "enterNewline")}</span>
                            <span className="text-xs text-muted-foreground">{t(value === "send" ? "enterSendsHint" : "enterNewlineHint")}</span>
                          </span>
                        </Menu.RadioItem>
                      ))}
                    </Menu.RadioGroup>
                  </Menu.Group>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </div>
      </div>
      <p id="message-hint" className="px-1 text-xs text-muted-foreground">
        {t(enterSends ? "composerHintSend" : "composerHintNewline")}
        {extraHint && ` ${extraHint}`}
      </p>
      <p id="message-error" role="alert" className="px-1 text-sm text-destructive empty:hidden">
        {state.status === "error" ? t(`errors.${state.code}`) : ""}
      </p>
    </form>
  );
}
