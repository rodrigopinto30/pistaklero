"use client";

import { Popover } from "@base-ui/react/popover";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { Bold, Heading2, Heading3, Highlighter, Italic, Link2, List, ListOrdered, Palette, Quote, Strikethrough, Underline } from "lucide-react";
import { useTranslations } from "next-intl";
import { type KeyboardEvent, type ReactNode, useRef, useState } from "react";
import { Tip } from "@/components/tip";
import { HIGHLIGHTS, TEXT_COLORS } from "@/lib/editor/palette";
import type { Gif } from "@/lib/gifs/gifs";
import { cn } from "@/lib/utils";
import { EmojiButton } from "./emoji-button";
import { GifButton } from "./gif-button";

const buttonClass =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground aria-pressed:bg-primary/10 aria-pressed:text-primary disabled:opacity-50 [&_svg]:size-4";

/**
 * Barra de formato (patrón "toolbar" de W3C): una sola parada de Tab y flechas para moverse entre
 * los botones. Cada botón dice si está activo (aria-pressed) y muestra su ayuda al pasar el mouse.
 * `inline`: solo el formato del texto (para una línea, como un título): sin títulos, listas, citas,
 * enlaces ni GIFs. Con `fieldId`, su nombre suma el del campo ("Formato Título"): si hay dos
 * editores en la página, cada barra se distingue.
 */
export function EditorToolbar({
  editor,
  fieldId,
  inline = false,
  gifs = false,
  gifLimitReached = false,
  gifLimitReason = "",
  onGif,
}: {
  editor: Editor;
  fieldId?: string;
  inline?: boolean;
  gifs?: boolean;
  gifLimitReached?: boolean;
  gifLimitReason?: string;
  onGif?: (gif: Gif) => void;
}) {
  const t = useTranslations("Editor");
  const bar = useRef<HTMLDivElement>(null);
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
      color: (e.getAttributes("textColor").value as string | undefined) ?? null,
      highlight: (e.getAttributes("textHighlight").value as string | undefined) ?? null,
    }),
  });

  // Flechas izquierda/derecha (e Inicio/Fin) recorren los botones; Tab sale de la barra.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const items = [...(bar.current?.querySelectorAll<HTMLElement>("[data-toolbar-item]") ?? [])].filter((item) => !item.hasAttribute("disabled"));
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (index === -1) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + items.length) % items.length;
    items.forEach((item, i) => item.setAttribute("tabindex", i === next ? "0" : "-1"));
    items[next]?.focus();
  };

  const toggle = (label: string, pressed: boolean | undefined, run: () => void, icon: ReactNode, first = false) => (
    <Tip label={label}>
      <button type="button" data-toolbar-item tabIndex={first ? 0 : -1} aria-pressed={Boolean(pressed)} aria-label={label} onClick={run} className={buttonClass}>
        {icon}
      </button>
    </Tip>
  );
  const chain = () => editor.chain().focus();

  return (
    <div
      ref={bar}
      role="toolbar"
      {...(fieldId ? { "aria-labelledby": `${fieldId}-toolbar ${fieldId}-label` } : { "aria-label": t("toolbar") })}
      onKeyDown={onKeyDown}
      className="flex min-h-11 flex-wrap items-center gap-0.5 border-b border-input/40 px-1.5 py-1"
    >
      {fieldId && (
        <span id={`${fieldId}-toolbar`} hidden>
          {t("toolbar")}
        </span>
      )}
      {toggle(t("bold"), state?.bold, () => chain().toggleBold().run(), <Bold aria-hidden="true" />, true)}
      {toggle(t("italic"), state?.italic, () => chain().toggleItalic().run(), <Italic aria-hidden="true" />)}
      {toggle(t("underline"), state?.underline, () => chain().toggleUnderline().run(), <Underline aria-hidden="true" />)}
      {toggle(t("strike"), state?.strike, () => chain().toggleStrike().run(), <Strikethrough aria-hidden="true" />)}
      <Separator />
      <ColorPicker
        label={t("color")}
        active={state?.color ?? null}
        options={TEXT_COLORS}
        noneLabel={t("colorNone")}
        names={(c) => t(`colors.${c}`)}
        swatch={(c) => <span aria-hidden="true" data-color={c} className="text-base font-bold">A</span>}
        onPick={(c) => (c ? chain().setTextColor(c).run() : chain().unsetTextColor().run())}
        icon={<Palette aria-hidden="true" />}
      />
      <ColorPicker
        label={t("highlight")}
        active={state?.highlight ?? null}
        options={HIGHLIGHTS}
        noneLabel={t("highlightNone")}
        names={(c) => t(`colors.${c}`)}
        swatch={(c) => <mark aria-hidden="true" data-highlight={c} className="px-1 text-sm">ab</mark>}
        onPick={(c) => (c ? chain().setTextHighlight(c).run() : chain().unsetTextHighlight().run())}
        icon={<Highlighter aria-hidden="true" />}
      />
      {!inline && (
        <>
          <Separator />
          {toggle(t("h2"), state?.h2, () => chain().toggleHeading({ level: 2 }).run(), <Heading2 aria-hidden="true" />)}
          {toggle(t("h3"), state?.h3, () => chain().toggleHeading({ level: 3 }).run(), <Heading3 aria-hidden="true" />)}
          {toggle(t("bulletList"), state?.bullet, () => chain().toggleBulletList().run(), <List aria-hidden="true" />)}
          {toggle(t("orderedList"), state?.ordered, () => chain().toggleOrderedList().run(), <ListOrdered aria-hidden="true" />)}
          {toggle(t("quote"), state?.quote, () => chain().toggleBlockquote().run(), <Quote aria-hidden="true" />)}
          <LinkEditor editor={editor} active={Boolean(state?.link)} />
        </>
      )}
      <Separator />
      <span data-toolbar-group className="contents">
        <EmojiButton onSelect={(emoji) => chain().insertContent(emoji).run()} />
        {gifs && onGif && <GifButton disabled={gifLimitReached} disabledReason={gifLimitReason} onSelect={onGif} />}
      </span>
    </div>
  );
}

function Separator() {
  return <span aria-hidden="true" className="mx-1 h-5 w-px bg-input/60" />;
}

/** Color de letra o resaltado: una paleta fija, cada opción con su nombre (no solo el color). */
function ColorPicker<T extends string>({
  label,
  active,
  options,
  noneLabel,
  names,
  swatch,
  onPick,
  icon,
}: {
  label: string;
  active: string | null;
  options: readonly T[];
  noneLabel: string;
  names: (color: T) => string;
  swatch: (color: T) => ReactNode;
  onPick: (color: T | null) => void;
  icon: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pick = (color: T | null) => {
    onPick(color);
    setOpen(false);
  };
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Tip label={label}>
        <Popover.Trigger data-toolbar-item tabIndex={-1} aria-label={label} aria-pressed={Boolean(active)} className={buttonClass}>
          {icon}
        </Popover.Trigger>
      </Tip>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start" className="z-50">
          <Popover.Popup aria-label={label} className="flex flex-col gap-1 rounded-xl bg-popover p-2 text-popover-foreground shadow-soft-lg outline-none">
            <div className="grid grid-cols-4 gap-1">
              {options.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => pick(color)}
                  aria-pressed={active === color}
                  aria-label={names(color)}
                  className={cn("flex h-9 min-w-9 items-center justify-center rounded-md hover:bg-muted aria-pressed:ring-2 aria-pressed:ring-primary")}
                >
                  {swatch(color)}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => pick(null)} className="min-h-9 rounded-md px-2 text-left text-sm hover:bg-muted">
              {noneLabel}
            </button>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Enlace: escribir la dirección (solo http, https o mailto) o quitarlo. */
function LinkEditor({ editor, active }: { editor: Editor; active: boolean }) {
  const t = useTranslations("Editor");
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [invalid, setInvalid] = useState(false);

  const onOpenChange = (next: boolean) => {
    if (next) {
      setUrl((editor.getAttributes("link").href as string | undefined) ?? "");
      setInvalid(false);
    }
    setOpen(next);
  };
  const apply = () => {
    const value = url.trim();
    const href = /^(https?:\/\/|mailto:)/i.test(value) ? value : value && !value.includes(":") ? `https://${value}` : "";
    if (!href) return setInvalid(true);
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setOpen(false);
  };
  const remove = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Tip label={t("link")}>
        <Popover.Trigger data-toolbar-item tabIndex={-1} aria-label={t("link")} aria-pressed={active} className={buttonClass}>
          <Link2 aria-hidden="true" />
        </Popover.Trigger>
      </Tip>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start" className="z-50">
          <Popover.Popup aria-label={t("link")} className="flex w-72 flex-col gap-2 rounded-xl bg-popover p-3 text-popover-foreground shadow-soft-lg outline-none">
            <label htmlFor="editor-link-url" className="text-sm font-medium">
              {t("linkUrl")}
            </label>
            <input
              id="editor-link-url"
              type="url"
              inputMode="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  apply();
                }
              }}
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? "editor-link-error" : undefined}
              placeholder="https://"
              className="h-10 rounded-lg border border-input bg-field px-3 text-base md:text-sm"
            />
            {invalid && (
              <p id="editor-link-error" className="text-sm text-destructive">
                {t("linkInvalid")}
              </p>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={apply} className="h-9 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
                {t("linkApply")}
              </button>
              {active && (
                <button type="button" onClick={remove} className="h-9 rounded-full px-3 text-sm font-medium hover:bg-muted">
                  {t("linkRemove")}
                </button>
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
