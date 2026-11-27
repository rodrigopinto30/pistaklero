import { describe, expect, it } from "vitest";
import {
  cityFromText,
  countryFromText,
  detectLanguage,
  htmlToText,
  inferSeniority,
  isoCountry,
  mapEmploymentType,
  safeHttpsUrl,
  salary,
  summarize,
} from "./normalize";

describe("htmlToText", () => {
  it("decodifica el HTML escapado de Greenhouse y saca las etiquetas", () => {
    const html = "&lt;div&gt;&lt;h2&gt;About us:&lt;/h2&gt;&lt;p&gt;We &amp;amp; you&lt;/p&gt;&lt;script&gt;alert(1)&lt;/script&gt;&lt;/div&gt;";
    expect(htmlToText(html)).toBe("About us:\nWe & you");
  });

  it("no deja pasar etiquetas aunque vengan rotas", () => {
    expect(htmlToText('<p onclick="x()">Hola <b>mundo</b></p><img src=x onerror=alert(1)>')).toBe("Hola mundo");
  });
});

describe("summarize", () => {
  it("corta en una palabra y agrega puntos suspensivos", () => {
    const text = "palabra ".repeat(100);
    const summary = summarize(text, 50);
    expect(summary.length).toBeLessThanOrEqual(50);
    expect(summary.endsWith("palabra…")).toBe(true);
  });
});

describe("inferencias", () => {
  it.each([
    ["Software Engineering Intern", "trainee"],
    ["Semi Senior Backend Developer", "semi_senior"],
    ["Junior Frontend Developer", "junior"],
    ["Staff Engineer", "lead"],
    ["Senior Product Designer", "senior"],
    ["Account Executive", "semi_senior"],
  ] as const)("%s → %s", (title, seniority) => {
    expect(inferSeniority(title)).toBe(seniority);
  });

  it("mapea el tipo de contrato de cada sistema", () => {
    expect(mapEmploymentType("FullTime")).toBe("full_time");
    expect(mapEmploymentType("PartTime")).toBe("part_time");
    expect(mapEmploymentType("Regular Full Time (Salary)")).toBe("full_time");
    expect(mapEmploymentType("Temporary")).toBe("contract");
    expect(mapEmploymentType("Internship")).toBe("internship");
  });

  it("detecta el idioma", () => {
    expect(detectLanguage("Buscamos una persona para sumarse al equipo de la empresa con experiencia en ventas.")).toBe("es");
    expect(detectLanguage("We are looking for an engineer to join our team and work with the company.")).toBe("en");
  });
});

describe("países", () => {
  it("resuelve nombres en inglés y en español, y estados de EE. UU.", () => {
    expect(countryFromText("Berlin, Berlin, Germany")).toBe("DE");
    expect(countryFromText("Remote - Germany")).toBe("DE");
    expect(countryFromText("Madrid, España")).toBe("ES");
    expect(countryFromText("Austin, TX")).toBe("US");
    expect(countryFromText("Toronto, ON")).toBe("CA");
    expect(countryFromText("Remote - European Union")).toBeNull();
  });

  it("usa los códigos actuales, no los alias", () => {
    expect(countryFromText("London, United Kingdom")).toBe("GB");
    expect(countryFromText("Moscow, Russia")).toBe("RU");
    expect(isoCountry("UK")).toBe("GB");
  });

  it("valida los códigos ISO", () => {
    expect(isoCountry("us")).toBe("US");
    expect(isoCountry("EU")).toBeNull();
    expect(isoCountry("XX")).toBeNull();
  });

  it("toma la ciudad solo si no es un país ni 'Remote'", () => {
    expect(cityFromText("Atlanta, Georgia")).toBe("Atlanta");
    expect(cityFromText("Remote - Germany")).toBeNull();
  });
});

describe("salary", () => {
  it("acepta un rango válido en una moneda conocida", () => {
    expect(salary(85000, 175000, "USD", "year")).toEqual({ salaryMin: 85000, salaryMax: 175000, salaryCurrency: "USD", salaryPeriod: "year" });
  });

  it("descarta rangos absurdos, monedas desconocidas o sin período", () => {
    expect(salary(1, 1000, "USD", "year")).toEqual({});
    expect(salary(100, 120, "GBP", "year")).toEqual({});
    expect(salary(100, 120, "USD", null)).toEqual({});
  });
});

it("solo acepta enlaces https", () => {
  expect(safeHttpsUrl("https://jobs.lever.co/x/1")).toBe("https://jobs.lever.co/x/1");
  expect(safeHttpsUrl("http://jobs.lever.co/x/1")).toBeNull();
  expect(safeHttpsUrl("javascript:alert(1)")).toBeNull();
});
