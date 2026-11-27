/** Escapa texto para insertarlo en HTML. Todo dato que venga de usuarios pasa por acá (OWASP A05). */
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Solo enlaces https (o http a 127.0.0.1 en desarrollo) dentro de los emails. */
export function safeEmailUrl(value: string): string {
  try {
    const url = new URL(value);
    const isLocal = url.protocol === "http:" && url.hostname === "127.0.0.1";
    return url.protocol === "https:" || isLocal ? url.toString() : "#";
  } catch {
    return "#";
  }
}

/** Plantilla base: modo oscuro, alto contraste, idioma marcado y versión de texto plano. */
export function layout({ lang, title, body }: { lang: string; title: string; body: string }) {
  return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:24px;background:#0a0c0b;color:#eef1ef;font-family:Arial,Helvetica,sans-serif;line-height:1.5">
    <main style="max-width:520px;margin:0 auto">
      <p style="font-size:20px;font-weight:bold;margin:0 0 16px">Pista<span style="color:#c5f25e">klero</span></p>
      ${body}
    </main>
  </body>
</html>`;
}

export function button(href: string, label: string) {
  return `<p><a href="${escapeHtml(safeEmailUrl(href))}" style="display:inline-block;padding:12px 20px;border-radius:12px;background:#c5f25e;color:#0a0c0b;font-weight:bold;text-decoration:none">${escapeHtml(label)}</a></p>`;
}

export function paragraph(text: string, muted = false) {
  return `<p style="${muted ? "color:#9aa39e;font-size:14px" : ""}">${escapeHtml(text)}</p>`;
}
