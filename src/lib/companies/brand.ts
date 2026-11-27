/**
 * Degradé propio de cada empresa sin portada: el tono sale del nombre (siempre el mismo para la misma
 * empresa). Es oscuro a propósito: el texto blanco encima cumple el contraste AA.
 */
export function brandHue(name: string) {
  let hash = 0;
  for (const char of name.toLowerCase()) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return hash % 360;
}

export function brandGradient(name: string) {
  const hue = brandHue(name);
  return `linear-gradient(135deg, hsl(${hue} 42% 34%), hsl(${(hue + 35) % 360} 48% 20%))`;
}
