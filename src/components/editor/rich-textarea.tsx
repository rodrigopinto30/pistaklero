"use client";

import { CharacterCount, Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { useTranslations } from "next-intl";
import { type ComponentProps, useEffect, useLayoutEffect, useRef } from "react";
import { useFeatures } from "@/components/features";
import { Textarea } from "@/components/ui/textarea";
import { countGifs, type Gif, MAX_GIFS } from "@/lib/gifs/gifs";
import { cn } from "@/lib/utils";
import { editorExtensions } from "./extensions";
import { EditorToolbar } from "./editor-toolbar";

/** Los atributos del área editable: su nombre (el rótulo), su ayuda y si tiene error. */
function editableAttributes({ id, describedBy, invalid, className }: { id?: string; describedBy?: string; invalid: boolean; className?: string }) {
  return {
    ...(id ? { id: `${id}-editor`, "aria-labelledby": `${id}-label` } : {}),
    role: "textbox",
    "aria-multiline": "true",
    ...(describedBy ? { "aria-describedby": describedBy } : {}),
    ...(invalid ? { "aria-invalid": "true" } : {}),
    class: cn("prose-editor min-h-32 px-3 py-2.5 text-base outline-none md:text-sm", className),
  };
}

/**
 * Editor visual para todos los textos que describen algo (publicaciones, ofertas, "Quiénes somos",
 * "Sobre mí", experiencia, proyectos): negrita, cursiva, subrayado, tachado, títulos, listas, citas,
 * enlaces, colores y resaltado de una paleta fija, emojis y GIFs (hasta 3).
 *
 * Guarda Markdown en un <textarea> (oculto mientras se ve el editor): sin JavaScript se escribe en
 * el textarea de siempre, al cargar no se mueve nada y "Guardar" se activa solo si algo cambió. El
 * editor tiene role="textbox" y su nombre es el del rótulo del campo. Cuando aparece el editor, el
 * textarea visible se reemplaza por uno oculto (otro elemento): lo escrito antes pasa al editor.
 */
export function RichTextarea({ className, defaultValue, id, maxLength, placeholder, "aria-describedby": describedBy, "aria-invalid": invalid, ...props }: ComponentProps<typeof Textarea>) {
  const t = useTranslations("Editor");
  const { gifs } = useFeatures();
  // Antes del editor, el textarea visible; después, uno oculto con lo que se envía.
  const fallback = useRef<HTMLTextAreaElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const typedBefore = useRef<string | null>(null);
  const initial = String(defaultValue ?? "");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      ...editorExtensions(),
      Markdown,
      Placeholder.configure({ placeholder: placeholder ?? t("placeholder") }),
      CharacterCount.configure({ limit: maxLength ?? null }),
    ],
    content: initial,
    contentType: "markdown",
    editorProps: {
      attributes: editableAttributes({ id, describedBy, invalid: Boolean(invalid), className }),
    },
    // Lo escrito antes de que cargara el editor (con una conexión lenta) no se pierde: pasa al
    // editor, y el foco también.
    onCreate: ({ editor }) => {
      const element = fallback.current;
      if (!element) return;
      if (element.value !== element.defaultValue) {
        typedBefore.current = element.value;
        editor.commands.setContent(element.value, { contentType: "markdown", emitUpdate: false });
      }
      if (document.activeElement === element) editor.commands.focus("end");
    },
    // Cada cambio pasa al textarea (es lo que se envía) y avisa al formulario.
    onUpdate: ({ editor }) => {
      const element = textarea.current;
      if (!element) return;
      element.value = editor.getMarkdown();
      element.dispatchEvent(new Event("input", { bubbles: true }));
    },
  });

  // El editor existe recién en el navegador: hasta entonces se ve (y funciona) el textarea.
  const ready = Boolean(editor);

  // El textarea oculto aparece con lo guardado: si se escribió antes de que cargara el editor, lleva eso.
  useLayoutEffect(() => {
    const element = textarea.current;
    if (!ready || !element || typedBefore.current === null || !editor) return;
    element.value = editor.getMarkdown();
    element.dispatchEvent(new Event("input", { bubbles: true }));
    typedBefore.current = null;
  }, [ready, editor]);

  // Si el servidor marca el campo con error, el editor lo anuncia (y es el que recibe el foco).
  useEffect(() => {
    editor?.setOptions({ editorProps: { ...editor.options.editorProps, attributes: editableAttributes({ id, describedBy, invalid: Boolean(invalid), className }) } });
  }, [editor, id, describedBy, invalid, className]);

  // Después de guardar, React vuelve el formulario a lo guardado: el editor también.
  useEffect(() => {
    const form = textarea.current?.form;
    if (!form || !editor) return;
    const onReset = () => setTimeout(() => editor.commands.setContent(textarea.current?.defaultValue ?? "", { contentType: "markdown" }), 0);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [editor]);

  const counts = useEditorState({
    editor,
    selector: ({ editor }) => ({
      characters: editor?.storage.characterCount?.characters() ?? 0,
      gifs: editor ? countGifs(editor.getMarkdown()) : countGifs(initial),
    }),
  });

  const addGif = (gif: Gif) => editor?.chain().focus().setImage({ src: gif.url, alt: `GIF: ${(gif.title || "GIF").slice(0, 120)}` }).run();

  return (
    <div className="flex flex-col rounded-lg border border-input bg-field focus-within:outline-2 focus-within:outline-ring">
      {ready && editor ? (
        <EditorToolbar
          editor={editor}
          fieldId={id}
          gifs={gifs}
          gifLimitReached={(counts?.gifs ?? 0) >= MAX_GIFS}
          gifLimitReason={t("gifLimit", { max: MAX_GIFS })}
          onGif={addGif}
        />
      ) : (
        // Mismo alto que la barra: al aparecer el editor no se corre nada.
        <div aria-hidden="true" className="h-11 border-b border-input/40" />
      )}
      {ready ? (
        <>
          <textarea key="field" ref={textarea} hidden defaultValue={initial} maxLength={maxLength ? maxLength * 3 : undefined} {...props} />
          <EditorContent editor={editor} />
        </>
      ) : (
        <Textarea
          key="fallback"
          ref={fallback}
          id={id}
          defaultValue={initial}
          maxLength={maxLength ? maxLength * 3 : undefined}
          placeholder={placeholder}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className={cn("min-h-32 rounded-t-none border-0 bg-transparent focus-visible:outline-none", className)}
          {...props}
        />
      )}
      {maxLength && (
        <p className="border-t border-input/40 px-3 py-1 text-right text-xs text-muted-foreground tabular-nums">
          {t("counter", { count: ready ? (counts?.characters ?? 0) : initial.length, max: maxLength })}
        </p>
      )}
    </div>
  );
}
