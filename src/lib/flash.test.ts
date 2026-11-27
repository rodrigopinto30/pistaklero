import { expect, it } from "vitest";
import { parseFlash } from "./flash";

it("solo acepta las claves conocidas", () => {
  expect(parseFlash("removed.lq2x9")).toEqual({ key: "removed", id: "removed.lq2x9" });
  expect(parseFlash("<script>.1")).toBeNull();
  expect(parseFlash("")).toBeNull();
  expect(parseFlash(undefined)).toBeNull();
});
