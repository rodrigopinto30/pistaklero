import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import type { Gif } from "@/lib/gifs/gifs";

/*
 * Buscador de GIFs (GIPHY) para el editor. La clave queda en el servidor; el navegador solo ve
 * las imágenes. Solo con sesión (los que escriben) y con contenido apto para todo público (rating g).
 */
type GiphyImage = { url: string; width: string; height: string; webp?: string };
type GiphyGif = { id: string; title: string; images: { fixed_height: GiphyImage; fixed_height_small?: GiphyImage; original: GiphyImage } };

export async function GET(request: NextRequest) {
  const key = process.env.GIPHY_API_KEY;
  if (!key) return NextResponse.json({ error: "disabled" }, { status: 404 });
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 50);
  const lang = params.get("lang") === "en" ? "en" : "es";
  const endpoint = new URL(`https://api.giphy.com/v1/gifs/${q ? "search" : "trending"}`);
  endpoint.search = new URLSearchParams({ api_key: key, limit: "24", rating: "g", ...(q ? { q, lang } : {}) }).toString();

  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(5000), cache: "no-store" });
    if (!response.ok) return NextResponse.json({ error: "upstream" }, { status: 502 });
    const { data } = (await response.json()) as { data: GiphyGif[] };
    const gifs: Gif[] = data.map((gif) => ({
      id: gif.id,
      title: gif.title,
      url: gif.images.fixed_height.url,
      preview: (gif.images.fixed_height_small ?? gif.images.fixed_height).webp ?? (gif.images.fixed_height_small ?? gif.images.fixed_height).url,
      width: Number(gif.images.fixed_height.width),
      height: Number(gif.images.fixed_height.height),
    }));
    return NextResponse.json({ gifs }, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch {
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
