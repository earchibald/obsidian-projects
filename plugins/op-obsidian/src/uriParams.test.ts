import { describe, it, expect } from "vitest";
import { normalizeUriParams, collectRepeated } from "./uriParams";

describe("normalizeUriParams", () => {
  it("decodes + as space in all string values", () => {
    expect(normalizeUriParams({ title: "foo+bar", scope: "a+b" })).toEqual({
      title: "foo bar",
      scope: "a b",
    });
  });

  it("leaves values without + untouched", () => {
    expect(normalizeUriParams({ title: "hello world" })).toEqual({ title: "hello world" });
  });

  it("returns a new object (does not mutate)", () => {
    const input = { a: "x+y" };
    const out = normalizeUriParams(input);
    expect(out).not.toBe(input);
    expect(input.a).toBe("x+y");
  });
});

describe("collectRepeated", () => {
  it("returns [] when key absent or empty", () => {
    expect(collectRepeated({}, "scope")).toEqual([]);
    expect(collectRepeated({ scope: "" }, "scope")).toEqual([]);
  });

  it("splits on newlines", () => {
    expect(collectRepeated({ scope: "a\nb\nc" }, "scope")).toEqual(["a", "b", "c"]);
  });

  it("splits on commas", () => {
    expect(collectRepeated({ scope: "a,b,c" }, "scope")).toEqual(["a", "b", "c"]);
  });

  it("trims and drops blanks", () => {
    expect(collectRepeated({ scope: " a , ,b\n\nc " }, "scope")).toEqual(["a", "b", "c"]);
  });
});
