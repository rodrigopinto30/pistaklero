import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { escapeLeadingBlock } from "@/lib/editor/text";
import { markdownSchema } from "./markdown";

/** Solo formato del texto: todo lo demás (títulos, listas, enlaces, imágenes) queda como texto o se va. */
const INLINE = ["strong", "em", "u", "s", "del", "span", "mark"];

/**
 * Un texto de una línea con formato (el título de una publicación), para mostrar dentro de un h1,
 * un enlace o una tarjeta: negrita, cursiva, subrayado, tachado, color y resaltado de la paleta.
 * Igual de seguro que <Markdown>: sin dangerouslySetInnerHTML y limpio con rehype-sanitize.
 * Si no tiene formato, es el texto tal cual (sin pasar por el Markdown).
 */
export function InlineMarkdown({ children }: { children: string }) {
  if (!/[*_~`<&\\]/.test(children)) return children;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSchema]]}
      allowedElements={INLINE}
      unwrapDisallowed
      components={{ del: ({ children: text }) => <s>{text}</s> }}
    >
      {escapeLeadingBlock(children)}
    </ReactMarkdown>
  );
}
