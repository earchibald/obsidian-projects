import { describe, it, expect } from "vitest";
import { normalizeUriParams, collectRepeated, parseLaunchVarsFromUri } from "./uriParams";

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

describe("parseLaunchVarsFromUri", () => {
  it("extracts each var.<name>=<value> key", () => {
    expect(
      parseLaunchVarsFromUri({
        id: "OP-1",
        "var.tone": "playful",
        "var.reviewer": "alice",
      }),
    ).toEqual({ tone: "playful", reviewer: "alice" });
  });

  it("preserves empty string as a distinct override value", () => {
    expect(parseLaunchVarsFromUri({ "var.tone": "" })).toEqual({ tone: "" });
  });

  it("ignores keys without the var. prefix", () => {
    expect(parseLaunchVarsFromUri({ id: "OP-1", agent: "claude" })).toEqual({});
  });

  it("silently drops malformed names (digits-first, empty, slashes)", () => {
    expect(
      parseLaunchVarsFromUri({
        "var.": "x",
        "var.1bad": "x",
        "var.has space": "x",
        "var.has/slash": "x",
        "var.good_one": "ok",
      }),
    ).toEqual({ good_one: "ok" });
  });

  it("accepts hyphenated and underscored names", () => {
    expect(
      parseLaunchVarsFromUri({
        "var.repo-path": "/abs",
        "var.review_target": "main",
      }),
    ).toEqual({ "repo-path": "/abs", review_target: "main" });
  });

  it("parses the packed `vars=name=val` form via collectRepeated", () => {
    expect(parseLaunchVarsFromUri({ vars: "tone=playful\nreviewer=alice" })).toEqual({
      tone: "playful",
      reviewer: "alice",
    });
    expect(parseLaunchVarsFromUri({ vars: "tone=playful,reviewer=alice" })).toEqual({
      tone: "playful",
      reviewer: "alice",
    });
  });

  it("packed-form values may contain `=` after the first one", () => {
    expect(parseLaunchVarsFromUri({ vars: "expr=a=b=c" })).toEqual({ expr: "a=b=c" });
  });

  it("packed form wins on duplicate names — explicit affordance overrides prefix scan", () => {
    expect(
      parseLaunchVarsFromUri({
        "var.tone": "from-prefix",
        vars: "tone=from-packed",
      }),
    ).toEqual({ tone: "from-packed" });
  });

  it("packed form drops malformed entries silently", () => {
    expect(
      parseLaunchVarsFromUri({
        vars: "ok=val\nbroken-no-equals\n=missing-name\n1bad=x",
      }),
    ).toEqual({ ok: "val" });
  });

  it("returns {} for an entirely empty record", () => {
    expect(parseLaunchVarsFromUri({})).toEqual({});
  });
});
