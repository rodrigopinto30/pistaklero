import { describe, expect, it } from "vitest";
import { nextPageQuery, parseSearchParams, toSearchArgs } from "./search";

describe("búsqueda", () => {
  it("ignora valores inválidos en la URL", () => {
    const filters = parseSearchParams({ seniority: ["junior", "hacker"], country: "ZZ", lang: "fr", page: "999" });
    expect(filters.seniority).toEqual(["junior"]);
    expect(filters.country).toBe("");
    expect(filters.language).toBe("");
    expect(filters.page).toBe(1);
  });

  it("combina los filtros rápidos con los avanzados", () => {
    const args = toSearchArgs(parseSearchParams({ remote: "1", junior: "1", mode: "hybrid", usd: "1" }));
    expect(args.p_work_modes?.sort()).toEqual(["hybrid", "remote"]);
    expect(args.p_seniorities?.sort()).toEqual(["junior", "trainee"]);
    expect(args.p_currency).toBe("USD");
  });

  it("pide más resultados en cada página", () => {
    expect(toSearchArgs(parseSearchParams({ page: "3" })).p_limit).toBe(60);
  });

  it("la página siguiente conserva los filtros", () => {
    expect(nextPageQuery({ q: "react", mode: ["remote", "hybrid"], page: "2" }, 2)).toBe("q=react&mode=remote&mode=hybrid&page=3");
  });
});
