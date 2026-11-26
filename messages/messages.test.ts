import { describe, expect, it } from "vitest";
import en from "./en.json";
import es from "./es.json";

type Messages = { [key: string]: string | Messages };

// Devuelve todas las claves hoja como "Namespace.clave", con su valor.
function flatten(messages: Messages, prefix = ""): Map<string, string> {
  const result = new Map<string, string>();
  for (const [key, value] of Object.entries(messages)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      result.set(path, value);
    } else {
      for (const [k, v] of flatten(value, path)) result.set(k, v);
    }
  }
  return result;
}

const catalogs = { es: flatten(es), en: flatten(en) };

describe("traducciones", () => {
  it("es y en tienen exactamente las mismas claves", () => {
    expect([...catalogs.en.keys()].sort()).toEqual([...catalogs.es.keys()].sort());
  });

  it.each(Object.entries(catalogs))("ninguna traducción en %s está vacía", (_, catalog) => {
    const empty = [...catalog].filter(([, value]) => value.trim() === "").map(([key]) => key);
    expect(empty).toEqual([]);
  });
});
