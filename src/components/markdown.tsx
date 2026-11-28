import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { HIGHLIGHTS, TEXT_COLORS } from "@/lib/editor/palette";
import { isGiphyUrl } from "@/lib/gifs/gifs";

/*
 * Textos de usuarios (descripciones, publicaciones, bio…) en Markdown. Seguro por diseño (OWASP A05):
 * - react-markdown arma elementos de React: nunca usa dangerouslySetInnerHTML.
 * - Del HTML que escribe el editor (subrayado, colores, resaltado) pasa solo una lista mínima, limpia
 *   con rehype-sanitize: <u>, <s>, <span data-color> y <mark data-highlight>, y solo con valores de la
 *   paleta. Nada de estilos en línea, scripts, eventos ni otros atributos.
 * - Imágenes, solo los GIFs de GIPHY (hasta 3 por texto, los elige quien escribe desde el editor).
 * - Los enlaces llevan rel="nofollow ugc noopener noreferrer" y solo pueden ser http, https o mailto.
 */
const ALLOWED = ["p", "br", "strong", "em", "u", "s", "del", "span", "mark", "ul", "ol", "li", "a", "h1", "h2", "h3", "h4", "blockquote", "code", "pre", "hr", "img"];

const schema = {
  ...defaultSchema,
  tagNames: ALLOWED,
  attributes: {
    a: ["href"],
    img: ["src", "alt"],
    span: [["dataColor", ...TEXT_COLORS]],
    mark: [["dataHighlight", ...HIGHLIGHTS]],
  },
  protocols: { href: ["http", "https", "mailto"], src: ["https"] },
};

export function Markdown({ children, lang }: { children: string; lang?: string }) {
  return (
    <div lang={lang} className="flex flex-col gap-3 leading-relaxed break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]}
        allowedElements={ALLOWED}
        unwrapDisallowed
        components={{
          // Los títulos del contenido bajan de nivel: el h1/h2 de la página es de la página.
          h1: ({ children }) => <h3 className="text-lg font-semibold">{children}</h3>,
          h2: ({ children }) => <h3 className="text-lg font-semibold">{children}</h3>,
          h3: ({ children }) => <h4 className="font-semibold">{children}</h4>,
          h4: ({ children }) => <h4 className="font-semibold">{children}</h4>,
          ul: ({ children }) => <ul className="ml-5 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="ml-5 list-decimal space-y-1">{children}</ol>,
          del: ({ children }) => <s>{children}</s>,
          a: ({ href, children }) => (
            <a href={href} rel="nofollow ugc noopener noreferrer" target="_blank" className="text-violet underline underline-offset-4">
              {children}
            </a>
          ),
          blockquote: ({ children }) => <blockquote className="border-l-2 border-input pl-4 text-muted-foreground">{children}</blockquote>,
          code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">{children}</code>,
          img: ({ src, alt }) =>
            typeof src === "string" && isGiphyUrl(src) ? (
              // eslint-disable-next-line @next/next/no-img-element -- GIF animado de GIPHY: no se optimiza.
              <img src={src} alt={alt ?? "GIF"} loading="lazy" referrerPolicy="no-referrer" className="max-h-72 w-auto max-w-full rounded-xl" />
            ) : null,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
