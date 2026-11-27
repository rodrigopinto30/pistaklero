import "server-only";
import dns from "node:dns";
import https from "node:https";
import net from "node:net";
import { isPublicAddress } from "./ip";

/*
 * Descarga de URLs que cargan las personas (vistas previas de proyectos), a prueba de SSRF:
 * - solo https y puerto 443, sin usuario ni contraseña en la URL;
 * - la IP se valida al conectar (lookup propio): una respuesta DNS que cambie entre la validación y la
 *   conexión (DNS rebinding) no sirve para llegar a la red interna;
 * - cada redirección se valida de nuevo, con un máximo de 3;
 * - timeout total y tope de tamaño, cortando la descarga apenas se pasa.
 */
export type SafeFetchError = "invalid_url" | "blocked_address" | "too_many_redirects" | "too_large" | "timeout" | "http_error" | "network";

export class SafeFetchFailure extends Error {
  constructor(readonly code: SafeFetchError) {
    super(code);
  }
}

export type SafeResponse = { url: string; contentType: string; body: Buffer };

type Options = { maxBytes: number; timeoutMs: number; maxRedirects?: number; accept: string };

/** Solo URLs https al puerto por defecto, sin credenciales. Las IP literales tienen que ser públicas. */
export function checkUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new SafeFetchFailure("invalid_url");
  }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) {
    throw new SafeFetchFailure("invalid_url");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) && !isPublicAddress(host)) throw new SafeFetchFailure("blocked_address");
  return url;
}

const safeLookup: typeof dns.lookup = ((hostname: string, options: dns.LookupOptions, callback: (...args: unknown[]) => void) => {
  dns.lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error);
    const list = addresses as dns.LookupAddress[];
    if (list.length === 0 || list.some((a) => !isPublicAddress(a.address))) {
      return callback(Object.assign(new Error("blocked_address"), { code: "EBLOCKED" }));
    }
    if (options.all) return callback(null, list);
    return callback(null, list[0]!.address, list[0]!.family);
  });
}) as typeof dns.lookup;

function requestOnce(url: URL, { maxBytes, accept }: Options, signal: AbortSignal) {
  return new Promise<{ status: number; location?: string; contentType: string; body: Buffer }>((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "GET",
        lookup: safeLookup,
        signal,
        headers: { Accept: accept, "User-Agent": "Pistaklero link preview", "Accept-Encoding": "identity" },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          return resolve({ status, location: res.headers.location, contentType: "", body: Buffer.alloc(0) });
        }
        if (Number(res.headers["content-length"] ?? 0) > maxBytes) {
          res.destroy();
          return reject(new SafeFetchFailure("too_large"));
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            res.destroy();
            reject(new SafeFetchFailure("too_large"));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => resolve({ status, contentType: String(res.headers["content-type"] ?? ""), body: Buffer.concat(chunks) }));
        res.on("error", () => reject(new SafeFetchFailure("network")));
      }
    );
    req.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EBLOCKED") reject(new SafeFetchFailure("blocked_address"));
      else if (error.name === "AbortError") reject(new SafeFetchFailure("timeout"));
      else reject(new SafeFetchFailure("network"));
    });
    req.end();
  });
}

export async function safeGet(value: string, options: Options): Promise<SafeResponse> {
  const signal = AbortSignal.timeout(options.timeoutMs);
  let url = checkUrl(value);
  for (let redirects = 0; ; redirects++) {
    const response = await requestOnce(url, options, signal);
    if (response.location) {
      if (redirects >= (options.maxRedirects ?? 3)) throw new SafeFetchFailure("too_many_redirects");
      url = checkUrl(new URL(response.location, url).toString());
      continue;
    }
    if (response.status < 200 || response.status >= 300) throw new SafeFetchFailure("http_error");
    return { url: url.toString(), contentType: response.contentType, body: response.body };
  }
}
