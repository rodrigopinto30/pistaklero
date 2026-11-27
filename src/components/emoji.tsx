import { cn } from "@/lib/utils";

/**
 * Emoji decorativo: suma un tono amigable sin que el lector de pantalla lo lea en voz alta
 * ("cara sonriente…") en medio de un título. Si el emoji dice algo, va en el texto, no acá.
 */
export function Emoji({ symbol, className }: { symbol: string; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("inline-block not-italic", className)}>
      {symbol}
    </span>
  );
}
