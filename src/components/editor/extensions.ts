import { type JSONContent, Mark, type MarkdownLexerConfiguration, type MarkdownParseHelpers, type MarkdownRendererHelpers, type MarkdownToken, mergeAttributes, Node } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import { escapeLeadingBlock } from "@/lib/editor/text";
import { isGiphyUrl } from "@/lib/gifs/gifs";
import { type Highlight, isHighlight, isTextColor, type TextColor } from "@/lib/editor/palette";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textColor: { setTextColor: (color: TextColor) => ReturnType; unsetTextColor: () => ReturnType };
    textHighlight: { setTextHighlight: (color: Highlight) => ReturnType; unsetTextHighlight: () => ReturnType };
  }
}

/**
 * Una marca que en Markdown se guarda como una etiqueta HTML segura con un dato de la paleta, por
 * ejemplo <span data-color="red">…</span>. Solo se aceptan los valores de la paleta.
 */
function paletteMark<T extends string>({ name, tag, attribute, valid }: { name: string; tag: "span" | "mark"; attribute: string; valid: (value: unknown) => value is T }) {
  const open = new RegExp(`^<${tag} ${attribute}="([a-z]+)">`);
  return Mark.create({
    name,
    addAttributes() {
      return {
        value: {
          default: null,
          parseHTML: (element: HTMLElement) => {
            const value = element.getAttribute(attribute);
            return valid(value) ? value : null;
          },
          renderHTML: (attributes: { value?: string | null }) => (attributes.value ? { [attribute]: attributes.value } : {}),
        },
      };
    },
    parseHTML() {
      return [{ tag: `${tag}[${attribute}]`, getAttrs: (element: HTMLElement) => (valid(element.getAttribute(attribute)) ? null : false) }];
    },
    renderHTML({ HTMLAttributes }) {
      return [tag, mergeAttributes(HTMLAttributes), 0];
    },
    renderMarkdown(node: JSONContent, helpers: MarkdownRendererHelpers) {
      const value = node.attrs?.value;
      const inner = helpers.renderChildren(node);
      return valid(value) ? `<${tag} ${attribute}="${value}">${inner}</${tag}>` : inner;
    },
    parseMarkdown(token: MarkdownToken, helpers: MarkdownParseHelpers) {
      return helpers.applyMark(name, helpers.parseInline(token.tokens ?? []), { value: (token as MarkdownToken & { value?: string }).value });
    },
    markdownTokenizer: {
      name,
      level: "inline",
      start: (src: string) => src.indexOf(`<${tag} ${attribute}=`),
      tokenize(src: string, _tokens: MarkdownToken[], lexer: MarkdownLexerConfiguration) {
        const match = open.exec(src);
        if (!match || !valid(match[1])) return undefined;
        const close = src.indexOf(`</${tag}>`, match[0].length);
        if (close === -1) return undefined;
        const text = src.slice(match[0].length, close);
        return { type: name, raw: src.slice(0, close + tag.length + 3), text, value: match[1], tokens: lexer.inlineTokens(text) };
      },
    },
  });
}

export const TextColorMark = paletteMark({ name: "textColor", tag: "span", attribute: "data-color", valid: isTextColor }).extend({
  addCommands() {
    return {
      setTextColor:
        (color: TextColor) =>
        ({ commands }) =>
          commands.setMark(this.name, { value: color }),
      unsetTextColor:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});

export const HighlightMark = paletteMark({ name: "textHighlight", tag: "mark", attribute: "data-highlight", valid: isHighlight }).extend({
  addCommands() {
    return {
      setTextHighlight:
        (color: Highlight) =>
        ({ commands }) =>
          commands.setMark(this.name, { value: color }),
      unsetTextHighlight:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});

/** Imágenes: solo GIFs de GIPHY (el resto se descarta), cada uno en su propio bloque. */
export const GiphyImage = Image.extend({
  parseHTML() {
    return [{ tag: "img[src]", getAttrs: (element: HTMLElement) => (isGiphyUrl(element.getAttribute("src")) ? null : false) }];
  },
}).configure({ inline: false, allowBase64: false });

/**
 * Las extensiones del editor (también las usa el test de ida y vuelta Markdown → editor → Markdown).
 * Títulos de dos niveles, listas, citas, código, enlaces seguros, subrayado, tachado, colores,
 * resaltado y GIFs de GIPHY.
 */
export function editorExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      link: {
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https", "mailto"],
        isAllowedUri: (url) => /^(https?:|mailto:)/i.test(url),
        HTMLAttributes: { rel: "nofollow ugc noopener noreferrer", target: "_blank" },
      },
    }),
    TextColorMark,
    HighlightMark,
    GiphyImage,
  ];
}

/** Un documento de un solo párrafo: el título es una línea (Enter no agrega otra). */
const SingleLineDocument = Node.create({
  name: "doc",
  topNode: true,
  content: "paragraph",
  // "1. Algo" o "# Algo" al principio quedan escapados: son texto, no una lista o un encabezado.
  renderMarkdown: (node: JSONContent, helpers: MarkdownRendererHelpers) => (node.content ? escapeLeadingBlock(helpers.renderChildren(node.content, " ")) : ""),
});

/**
 * Las extensiones del título de una publicación: una línea con negrita, cursiva, subrayado,
 * tachado, colores y resaltado (y emojis, que son texto). Sin títulos, listas, enlaces ni GIFs.
 */
export function titleExtensions() {
  return [
    SingleLineDocument,
    StarterKit.configure({
      document: false,
      heading: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      listKeymap: false,
      blockquote: false,
      codeBlock: false,
      code: false,
      horizontalRule: false,
      hardBreak: false,
      link: false,
      dropcursor: false,
      gapcursor: false,
      trailingNode: false,
    }),
    TextColorMark,
    HighlightMark,
  ];
}
