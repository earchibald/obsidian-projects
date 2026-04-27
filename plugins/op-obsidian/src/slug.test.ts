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
