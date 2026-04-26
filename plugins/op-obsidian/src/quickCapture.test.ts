import { describe, it, expect } from "vitest";
import { deriveTitle, packScope, resolveCaptureProject } from "./quickCapture";
import type { ProjectInfo } from "./projects";
import type { RecencyEntry } from "./recencyLog";

describe("deriveTitle", () => {
  it("returns empty for empty / whitespace input", () => {
    expect(deriveTitle("")).toBe("");
    expect(deriveTitle("   \n   \n")).toBe("");
  });

  it("takes the first non-empty line", () => {
    expect(deriveTitle("\n\nfirst real line\nsecond")).toBe("first real line");
  });

  it("strips heading markers", () => {
    expect(deriveTitle("## A nested header")).toBe("A nested header");
    expect(deriveTitle("# Title")).toBe("Title");
  });

  it("strips list bullets and task checkboxes", () => {
    expect(deriveTitle("- [ ] do the thing")).toBe("do the thing");
    expect(deriveTitle("* bullet content")).toBe("bullet content");
    expect(deriveTitle("- [x] done already")).toBe("done already");
  });

  it("strips blockquote markers", () => {
    expect(deriveTitle("> quoted thought")).toBe("quoted thought");
    expect(deriveTitle("> - [ ] inside a quote")).toBe("inside a quote");
  });

  it("collapses internal whitespace", () => {
    expect(deriveTitle("foo   bar\tbaz")).toBe("foo bar baz");
  });

  it("caps at 120 chars without ellipsis", () => {
    const long = "a".repeat(200);
    const out = deriveTitle(long);
    expect(out.length).toBe(120);
    expect(out.endsWith("…")).toBe(false);
  });

  it("never expands beyond the first line — even if first line is short", () => {
    expect(deriveTitle("one\nand a much longer second line that would have been a better title")).toBe(
      "one",
    );
  });

  it("strips zero-width space / invisible chars so the title is never visually empty but non-empty", () => {
    // U+200B is not stripped by String.prototype.trim() — without explicit
    // handling, a line containing only a ZWS would produce a title that looks
    // blank in the modal but passes the "title is required" validation.
    expect(deriveTitle("\u200B")).toBe("");
    expect(deriveTitle("\u200B\u200C\u200D\uFEFF\u00AD")).toBe("");
    // ZWS mixed with real text is normalised out but the real text survives.
    expect(deriveTitle("\u200Bfoo\u200B bar")).toBe("foo bar");
  });

  it("handles tab-indented list bullets", () => {
    expect(deriveTitle("\t- foo bar")).toBe("foo bar");
  });
});

describe("packScope", () => {
  it("returns the captured text verbatim (trailing whitespace trimmed)", () => {
    const text = "Paragraph one.\n\nParagraph two.\n\n";
    expect(packScope({ text })).toBe("Paragraph one.\n\nParagraph two.");
  });

  it("preserves internal markdown structure (bullets, blockquotes, blank lines)", () => {
    const text = "- foo\n- bar\n\n> quote\n";
    expect(packScope({ text })).toBe("- foo\n- bar\n\n> quote");
  });

  it("falls back to a backlink bullet when text is empty and a fallback is given", () => {
    expect(packScope({ text: "", fallbackBacklinkTo: "OP-159 source note" })).toBe(
      "Source: [[OP-159 source note]]",
    );
  });

  it("treats whitespace-only text as empty for fallback purposes", () => {
    expect(packScope({ text: "   \n  ", fallbackBacklinkTo: "Note" })).toBe("Source: [[Note]]");
  });

  it("returns empty string when text is empty and no fallback is given", () => {
    expect(packScope({ text: "" })).toBe("");
    expect(packScope({ text: "   " })).toBe("");
  });

  it("trims a whitespace-only fallback to nothing", () => {
    expect(packScope({ text: "", fallbackBacklinkTo: "   " })).toBe("");
  });

  it("sanitises wikilink-breaking chars from the fallback note title", () => {
    // A note name containing ]] would prematurely close the [[ … ]] span and
    // produce a split or broken wikilink in the rendered markdown.
    expect(packScope({ text: "", fallbackBacklinkTo: "Meeting notes [2026-01]]" })).toBe(
      "Source: [[Meeting notes 2026-01]]",
    );
    // Other wikilink-special chars are also stripped.
    expect(packScope({ text: "", fallbackBacklinkTo: "Foo | bar # baz ^ qux" })).toBe(
      "Source: [[Foo  bar  baz  qux]]",
    );
  });
});

describe("resolveCaptureProject", () => {
  const projectA: ProjectInfo = { slug: "alpha", prefix: "AL", statusPath: "Projects/alpha/STATUS.md" };
  const projectB: ProjectInfo = { slug: "bravo", prefix: "BR", statusPath: "Projects/bravo/STATUS.md" };
  const projects = [projectA, projectB];

  function recent(...ids: string[]): RecencyEntry[] {
    return ids.map((id, i) => ({ id, at: new Date(2026, 0, i + 1).toISOString() }));
  }

  it("(a) returns the project whose slug matches active note's frontmatter", () => {
    const out = resolveCaptureProject({
      activeProjectSlug: "bravo",
      recent: recent("AL-1"),
      projects,
    });
    expect(out).toBe(projectB);
  });

  it("(b) falls through to the recency log when active slug is missing", () => {
    const out = resolveCaptureProject({
      activeProjectSlug: undefined,
      recent: recent("BR-3", "AL-1"),
      projects,
    });
    expect(out).toBe(projectB);
  });

  it("(b) falls through to the recency log when active slug doesn't match any project", () => {
    const out = resolveCaptureProject({
      activeProjectSlug: "charlie-deleted",
      recent: recent("BR-3"),
      projects,
    });
    expect(out).toBe(projectB);
  });

  it("(b) advances past stale recency entries whose prefix no longer resolves", () => {
    const out = resolveCaptureProject({
      activeProjectSlug: undefined,
      recent: recent("XX-9", "GONE-2", "AL-7"),
      projects,
    });
    expect(out).toBe(projectA);
  });

  it("(b) skips malformed recency entries", () => {
    const out = resolveCaptureProject({
      activeProjectSlug: undefined,
      recent: [
        { id: "not-an-id", at: "2026-01-01T00:00:00Z" },
        { id: "AL-12", at: "2026-01-02T00:00:00Z" },
      ],
      projects,
    });
    expect(out).toBe(projectA);
  });

  it("(c) returns null when both (a) and (b) fail", () => {
    expect(
      resolveCaptureProject({
        activeProjectSlug: undefined,
        recent: recent("XX-1"),
        projects,
      }),
    ).toBeNull();
  });

  it("(c) returns null on empty inputs", () => {
    expect(
      resolveCaptureProject({ activeProjectSlug: undefined, recent: [], projects: [] }),
    ).toBeNull();
  });

  it("ignores projects with no prefix when matching by recency", () => {
    const noPrefix: ProjectInfo = { slug: "meta", statusPath: "Projects/meta/STATUS.md" };
    const out = resolveCaptureProject({
      activeProjectSlug: undefined,
      recent: recent("AL-1"),
      projects: [noPrefix, projectA],
    });
    expect(out).toBe(projectA);
  });
});
