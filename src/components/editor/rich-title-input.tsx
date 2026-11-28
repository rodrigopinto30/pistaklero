"use client";

import { CharacterCount, Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { useTranslations } from "next-intl";
import { type ComponentProps, useEffect, useLayoutEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { escapeLeadingBlock } from "@/lib/editor/text";
import { cn } from "@/lib/utils";
import { EditorToolbar } from "./editor-toolbar";
import { titleExtensions } from "./extensions";

/** Los atributos del área editable: su nombre (el rótulo), su ayuda y si tiene error. */
function editableAttributes({ id, describedBy, invalid, className }: { id?: string; describedBy?: string; invalid: boolean; className?: string }) {
  return {
    ...(id ? { id: `${id}-editor`, "aria-labelledby": `${id}-label` } : {}),
    role: "textbox",
    ...(describedBy ? { "aria-describedby": describedBy } : {}),
    ...(invalid ? { "aria-invalid": "true" } : {}),
    class: cn("prose-editor min-h-10 px-3 py-2 text-base outline-none md:text-sm", className),
  };
}

/**
 * Un campo de una línea con formato (el título de una publicación): negrita, cursiva, subrayado,
 * tachado, color, resaltado y emojis. Enter no agrega renglones y lo pegado queda en una línea.
 *
 * Como el editor de textos largos, guarda Markdown en un <input> (oculto mientras se ve el editor):
 * sin JavaScript se escribe en el campo de siempre y "Guardar" se activa solo si algo cambió. El
 * editor tiene role="textbox" y su nombre es el del rótulo del campo. Lo escrito antes de que
 * cargue el editor pasa al editor.
 */
export function RichTitleInput({ className, defaultValue, id, maxLength, placeholder, "aria-describedby": describedBy, "aria-invalid": invalid, ...props }: ComponentProps<typeof Input>) {
  const t = useTranslations("Editor");
  // Antes del editor, el campo visible; después, uno oculto con lo que se envía.
  const fallback = useRef<HTMLInputElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const typedBefore = useRef<string | null>(null);
  const initial = String(defaultValue ?? "");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [...titleExtensions(), Markdown, Placeholder.configure({ placeholder: placeholder ?? "" }), CharacterCount.configure({ limit: maxLength ?? null })],
    // Un título viejo que empieza con "1. " se lee como texto (ver escapeLeadingBlock).
    content: escapeLeadingBlock(initial),
    contentType: "markdown",
    editorProps: {
      attributes: editableAttributes({ id, describedBy, invalid: Boolean(invalid), className }),
      // Una sola línea: Enter no hace nada (como en un campo común, pero sin publicar sin querer).
      handleKeyDown: (_view, event) => event.key === "Enter" && !event.isComposing,
      // Lo pegado con saltos de línea queda en una línea.
      transformPastedText: (text) => text.replace(/\s*[\r\n]+\s*/g, " "),
    },
    // Lo escrito antes de que cargara el editor (con una conexión lenta) no se pierde.
    onCreate: ({ editor }) => {
      const element = fallback.current;
      if (!element) return;
      if (element.value !== element.defaultValue) {
        typedBefore.current = element.value;
        editor.commands.setContent(escapeLeadingBlock(element.value), { contentType: "markdown", emitUpdate: false });
      }
      if (document.activeElement === element) editor.commands.focus("end");
    },
    onUpdate: ({ editor }) => {
      const element = input.current;
      if (!element) return;
      element.value = editor.getMarkdown().replace(/\s*\n+\s*/g, " ").trim();
      element.dispatchEvent(new Event("input", { bubbles: true }));
    },
  });
  const ready = Boolean(editor);

  // El campo oculto aparece con lo guardado: si se escribió antes de que cargara el editor, lleva eso.
  useLayoutEffect(() => {
    const element = input.current;
    if (!ready || !element || typedBefore.current === null || !editor) return;
    element.value = editor.getMarkdown().replace(/\s*\n+\s*/g, " ").trim();
    element.dispatchEvent(new Event("input", { bubbles: true }));
    typedBefore.current = null;
  }, [ready, editor]);

  // Si el servidor marca el título con error, el editor lo anuncia (y recibe el foco).
  useEffect(() => {
    editor?.setOptions({ editorProps: { ...editor.options.editorProps, attributes: editableAttributes({ id, describedBy, invalid: Boolean(invalid), className }) } });
  }, [editor, id, describedBy, invalid, className]);

  // Después de guardar, React vuelve el formulario a lo guardado: el editor también.
  useEffect(() => {
    const form = input.current?.form;
    if (!form || !editor) return;
    const onReset = () => setTimeout(() => editor.commands.setContent(escapeLeadingBlock(input.current?.defaultValue ?? ""), { contentType: "markdown" }), 0);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [editor]);

  const characters = useEditorState({ editor, selector: ({ editor }) => editor?.storage.characterCount?.characters() ?? 0 });

  return (
    <div className="flex flex-col rounded-lg border border-input bg-field focus-within:outline-2 focus-within:outline-ring">
      {ready && editor ? (
        <EditorToolbar editor={editor} fieldId={id} inline />
      ) : (
        // Mismo alto que la barra: al aparecer el editor no se corre nada.
        <div aria-hidden="true" className="h-11 border-b border-input/40" />
      )}
      {ready ? (
        <>
          <input key="field" ref={input} type="text" hidden defaultValue={initial} maxLength={maxLength ? maxLength * 3 : undefined} {...props} />
          <EditorContent editor={editor} />
        </>
      ) : (
        <Input
          key="fallback"
          ref={fallback}
          id={id}
          defaultValue={initial}
          maxLength={maxLength ? maxLength * 3 : undefined}
          placeholder={placeholder}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className={cn("h-10 rounded-t-none border-0 bg-transparent focus-visible:outline-none", className)}
          {...props}
        />
      )}
      {maxLength && (
        <p className="border-t border-input/40 px-3 py-1 text-right text-xs text-muted-foreground tabular-nums">
          {t("counter", { count: ready ? (characters ?? 0) : initial.length, max: maxLength })}
        </p>
      )}
    </div>
  );
}
