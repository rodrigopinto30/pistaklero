import ReactMarkdown from "react-markdown";

/*
 * Markdown de usuarios (descripciones de ofertas). Seguro por diseño (OWASP A05):
 * - react-markdown arma elementos de React: no usa dangerouslySetInnerHTML ni interpreta HTML crudo.
 * - Solo se permiten estos elementos; imágenes no (evitan rastreo y contenido de terceros).
 * - Los enlaces llevan rel="nofollow ugc noopener noreferrer" y su URL pasa por el filtro por defecto
 *   (descarta javascript: y similares).
 */
const ALLOWED = ["p", "br", "strong", "em", "ul", "ol", "li", "a", "h1", "h2", "h3", "h4", "blockquote", "code", "pre", "hr"];

export function Markdown({ children, lang }: { children: string; lang?: string }) {
  return (
    <div lang={lang} className="flex flex-col gap-3 leading-relaxed">
      <ReactMarkdown
        allowedElements={ALLOWED}
        unwrapDisallowed
        skipHtml
        components={{
          // Los títulos del contenido bajan de nivel: el h1/h2 de la página es de la página.
          h1: ({ children }) => <h3 className="text-lg font-semibold">{children}</h3>,
          h2: ({ children }) => <h3 className="text-lg font-semibold">{children}</h3>,
          h3: ({ children }) => <h4 className="font-semibold">{children}</h4>,
          h4: ({ children }) => <h4 className="font-semibold">{children}</h4>,
          ul: ({ children }) => <ul className="ml-5 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="ml-5 list-decimal space-y-1">{children}</ol>,
          a: ({ href, children }) => (
            <a href={href} rel="nofollow ugc noopener noreferrer" target="_blank" className="text-violet underline underline-offset-4">
              {children}
            </a>
          ),
          blockquote: ({ children }) => <blockquote className="border-l-2 border-input pl-4 text-muted-foreground">{children}</blockquote>,
          code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">{children}</code>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
