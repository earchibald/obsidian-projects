import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  describe("defaults (case-preserving, kebab-only, no cap, no fallback)", () => {
    it("passes a kebab-safe ASCII string through unchanged", () => {
      expect(slugify("OP-37")).toBe("OP-37");
    });

    it("replaces tmux-unsafe punctuation with dashes and collapses runs", () => {
      expect(slugify("OP.37:1 x")).toBe("OP-37-1-x");
    });

    it("returns empty string when input collapses to nothing and no fallback set", () => {
      expect(slugify("...")).toBe("");
    });

    it("returns empty string for empty input", () => {
      expect(slugify("")).toBe("");
    });

    it("trims leading and trailing dashes after collapse", () => {
      expect(slugify("---hello---world---")).toBe("hello-world");
    });

    it("treats `_` as a separator by default (no allowUnderscore)", () => {
      expect(slugify("foo_bar")).toBe("foo-bar");
    });
  });

  describe("fallback option", () => {
    it("returns the fallback when input collapses to empty", () => {
      expect(slugify("...", { fallback: "agent" })).toBe("agent");
    });

    it("ignores the fallback when input produces a real slug", () => {
      expect(slugify("OP-37", { fallback: "agent" })).toBe("OP-37");
    });
  });

  describe("allowUnderscore option", () => {
    it("preserves underscores when allowUnderscore=true", () => {
      expect(slugify("foo_bar", { allowUnderscore: true })).toBe("foo_bar");
    });

    it("matches the legacy tmuxWindowName behavior — underscore + case preserved, fallback agent", () => {
      expect(slugify("OP.37:1 x", { allowUnderscore: true, fallback: "agent" })).toBe("OP-37-1-x");
      expect(slugify("op:workflow:my-project", { allowUnderscore: true, fallback: "agent" }))
        .toBe("op-workflow-my-project");
      expect(slugify("...", { allowUnderscore: true, fallback: "agent" })).toBe("agent");
    });
  });

  describe("caseFold option", () => {
    it("lower-cases ASCII when caseFold=true", () => {
      expect(slugify("Hello-World", { caseFold: true })).toBe("hello-world");
    });

    it("treats unicode letters as separators after lowercasing", () => {
      // `é → -` because `[a-z]` is ASCII-only after lowercasing.
      expect(slugify("café résumé", { caseFold: true })).toBe("caf-r-sum");
    });

    it("preserves case when caseFold is false (default)", () => {
      expect(slugify("Hello-World")).toBe("Hello-World");
    });

    it("combined with allowUnderscore preserves underscore + lowercase", () => {
      expect(slugify("Hello_World", { caseFold: true, allowUnderscore: true })).toBe("hello_world");
    });
  });

  describe("maxLen option", () => {
    it("does not truncate when output is at or under the cap", () => {
      expect(slugify("alphabet-soup", { maxLen: 13 })).toBe("alphabet-soup");
      expect(slugify("alphabet-soup", { maxLen: 50 })).toBe("alphabet-soup");
    });

    it("truncates at the last `-` boundary inside the cap when one exists", () => {
      expect(slugify("alphabet-soup-rocks", { maxLen: 14 })).toBe("alphabet-soup");
    });

    it("truncates flat when no `-` exists inside the cap", () => {
      expect(slugify("alphabetsoup", { maxLen: 6 })).toBe("alphab");
    });

    it("re-trims trailing `-` after dash-boundary truncation", () => {
      // truncated slice has a trailing `-`; the last-dash branch removes it.
      // truncated="alphabet-" lastDash=8 -> sliced="alphabet"
      expect(slugify("alphabet-soup", { maxLen: 9 })).toBe("alphabet");
    });

    it("cap = 0 collapses any non-empty input to empty (fallback fires if set)", () => {
      expect(slugify("hello", { maxLen: 0 })).toBe("");
      expect(slugify("hello", { maxLen: 0, fallback: "x" })).toBe("x");
    });

    it("cap = 1 flat-truncates to the first character (no dash in a 1-char slice)", () => {
      expect(slugify("hello", { maxLen: 1 })).toBe("h");
      // A post-collapse string starting with a letter can't start with `-`, so
      // the flat-truncation path is always taken at cap=1.
      expect(slugify("a-b-c", { maxLen: 1 })).toBe("a");
    });

    it("very long input is capped and lands on a `-` boundary", () => {
      const long = "Add slug plugin var and extract shared slugify util and other goodies";
      const out = slugify(long, { caseFold: true, maxLen: 40 });
      expect(out.length).toBeLessThanOrEqual(40);
      expect(out.endsWith("-")).toBe(false);
      // Sanity: starts with the real prefix, not a clipped word
      expect(out.startsWith("add-slug-plugin-var")).toBe(true);
    });
  });

  describe("stripLeadingTaskPrefix option", () => {
    it("strips a leading `NNb:` prefix when on", () => {
      expect(slugify("10b: Authoring tutorials", { caseFold: true, stripLeadingTaskPrefix: true }))
        .toBe("authoring-tutorials");
    });

    it("strips a leading `NN:` prefix when on", () => {
      expect(slugify("10: Authoring tutorials", { caseFold: true, stripLeadingTaskPrefix: true }))
        .toBe("authoring-tutorials");
    });

    it("leaves the prefix as part of the slug when off", () => {
      expect(slugify("10b: Authoring tutorials", { caseFold: true }))
        .toBe("10b-authoring-tutorials");
    });

    it("only strips when the prefix is followed by a colon", () => {
      // No colon after the leading number -> normal slugify.
      expect(slugify("10b Authoring tutorials", { caseFold: true, stripLeadingTaskPrefix: true }))
        .toBe("10b-authoring-tutorials");
    });

    it("does not strip an issue-id prefix like OP-220", () => {
      // No leading digits-colon, so the prefix stays.
      expect(slugify("OP-220 Title", { caseFold: true, stripLeadingTaskPrefix: true }))
        .toBe("op-220-title");
    });

    it("tolerates leading whitespace before the prefix", () => {
      expect(slugify("  3: Hello", { caseFold: true, stripLeadingTaskPrefix: true })).toBe("hello");
    });

    it("does NOT strip a leading `: hello` that has no digits before the colon", () => {
      // Regex requires \d+ at start; a bare colon prefix does not match.
      // The colon is slugified away normally, so the result is the same as
      // without stripping — but the important contract is that the regex
      // didn't fire on a non-digit-prefixed colon.
      expect(slugify(": hello", { caseFold: true, stripLeadingTaskPrefix: true })).toBe("hello");
      expect(slugify(": hello", { caseFold: true, stripLeadingTaskPrefix: false })).toBe("hello");
    });

    it("does NOT strip `1.5: x` — a dot between the digit and colon is not in the pattern", () => {
      // `\d+[a-z]?\s*:` cannot match `1.5:` because after `1` the next char
      // is `.` (not a letter or `:`) so the optional `[a-z]?` skips it and
      // `\s*:` requires `:` immediately — but `.` is there instead.
      expect(slugify("1.5: x", { caseFold: true, stripLeadingTaskPrefix: true })).toBe("1-5-x");
    });

    it("strips only the first `NN:` segment from a multi-colon title", () => {
      // The regex is anchored (^) and has no `g` flag — one application only.
      // `1: 2: 3` → strip `1: ` → `2: 3` → slug `2-3`.
      expect(slugify("1: 2: 3", { caseFold: true, stripLeadingTaskPrefix: true })).toBe("2-3");
      // Verify without stripping produces the full slug.
      expect(slugify("1: 2: 3", { caseFold: true, stripLeadingTaskPrefix: false })).toBe("1-2-3");
    });

    it("strips an oversized numeric-only prefix like `1234567890b:`", () => {
      // The regex matches any run of digits (\d+) regardless of length, so
      // very large task numbers are still stripped — intentional.
      expect(slugify("1234567890b: long", { caseFold: true, stripLeadingTaskPrefix: true })).toBe("long");
    });
  });

  describe("plugin-var registry preset (caseFold + maxLen=40 + stripLeadingTaskPrefix)", () => {
    const PRESET = { caseFold: true, maxLen: 40, stripLeadingTaskPrefix: true } as const;

    it("renders a typical issue title into a kebab branch tail", () => {
      expect(slugify("Add {{slug}} plugin var + extract shared slugify util", PRESET))
        .toBe("add-slug-plugin-var-extract-shared");
    });

    it("returns empty string for an all-punctuation title (registry chains `|| undefined`)", () => {
      expect(slugify("???", PRESET)).toBe("");
    });

    it("strips a numeric-letter task prefix and keeps the body", () => {
      expect(slugify("10b: Authoring tutorials with checked-in examples", PRESET))
        .toBe("authoring-tutorials-with-checked-in");
    });
  });
});
