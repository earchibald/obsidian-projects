import { describe, it, expect } from "vitest";
import {
  backupPathFor,
  findLatestBackup,
  formatBackupTimestamp,
  formatUnifiedDiff,
  parseBackupTimestamp,
  planBadModelPatch,
} from "./recoveryPatch";

const PATH = "Projects/foo/WORKFLOW.md";

function fm(body: string): string {
  return `---\n${body}\n---\n# WORKFLOW\n\nbody prose here.\n`;
}

describe("planBadModelPatch", () => {
  it("rewrites a scalar `model: <bad>` to the canonical id", () => {
    const raw = fm(
      [
        "type: workflow",
        "schema: 1",
        "project: foo",
        "default_agent: claude",
        "default_model: opuss",
      ].join("\n"),
    );
    const r = planBadModelPatch({
      raw,
      path: PATH,
      badName: "opuss",
      replacement: "claude-opus-4-7",
    });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.newText).toContain("default_model: claude-opus-4-7");
    expect(r.newText).not.toContain("opuss");
    // body prose untouched
    expect(r.newText).toContain("# WORKFLOW");
    expect(r.newText).toContain("body prose here.");
  });

  it("rewrites a flow-list element without disturbing siblings", () => {
    const raw = fm(
      [
        "type: workflow",
        "default_model: [opus, opuss, sonnet]",
      ].join("\n"),
    );
    const r = planBadModelPatch({
      raw,
      path: PATH,
      badName: "opuss",
      replacement: "claude-haiku-4-5-20251001",
    });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.newText).toContain("[opus, claude-haiku-4-5-20251001, sonnet]");
  });

  it("rewrites a block-list element", () => {
    const raw = fm(
      ["type: workflow", "default_model:", "  - opus", "  - opuss", "  - sonnet"].join("\n"),
    );
    const r = planBadModelPatch({
      raw,
      path: PATH,
      badName: "opuss",
      replacement: "claude-haiku-4-5",
    });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.newText).toContain("- claude-haiku-4-5");
    expect(r.newText.match(/- opus\b/g)?.length).toBe(1);
  });

  it("preserves quoting around a quoted scalar", () => {
    const raw = fm(['default_model: "opuss"'].join("\n"));
    const r = planBadModelPatch({
      raw,
      path: PATH,
      badName: "opuss",
      replacement: "claude-opus-4-7",
    });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.newText).toContain('default_model: "claude-opus-4-7"');
  });

  it("does NOT match the bad name as a substring of a longer token", () => {
    const raw = fm(
      ["default_model: claude-opus-4-7", 'note: "opus is preferred"'].join("\n"),
    );
    const r = planBadModelPatch({
      raw,
      path: PATH,
      badName: "opus",
      replacement: "sonnet",
    });
    // `opus` appears once as a free token (the note), but inside
    // `claude-opus-4-7` it sits between hyphens which are token chars.
    // Both should be matchable individually — the registry's word boundary
    // treats `[A-Za-z0-9._-]` as token chars, so `opus` is NOT inside
    // `claude-opus-4-7` (the leading char is `-`, which is a token char,
    // so the run containing `opus` is the whole `claude-opus-4-7`).
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.newText).toContain("note: \"sonnet is preferred\"");
    expect(r.newText).toContain("claude-opus-4-7");
  });

  it("returns ambiguous when the bad name appears in multiple frontmatter lines", () => {
    const raw = fm(["default_model: opuss", "steps:", "  - step: kickoff", "    model: opuss"].join("\n"));
    const r = planBadModelPatch({
      raw,
      path: PATH,
      badName: "opuss",
      replacement: "claude-opus-4-7",
    });
    expect(r.status).toBe("ambiguous");
    if (r.status !== "ambiguous") return;
    expect(r.matches).toBe(2);
  });

  // Issue 1: the bad name in a YAML inline comment on the same line as the
  // value counts as a second occurrence and triggers "ambiguous". This is
  // intentionally conservative — patching the wrong token silently is worse
  // than asking the user to edit manually. The dialog disables the patch
  // button and shows "multiple occurrences" so the user knows why.
  it("treats a bad name in an inline YAML comment as a second occurrence (ambiguous, conservative)", () => {
    const raw = fm([
      "default_model: opuss  # was opuss in a prior commit",
    ].join("\n"));
    const r = planBadModelPatch({
      raw,
      path: PATH,
      badName: "opuss",
      replacement: "claude-opus-4-7",
    });
    // Two token-matches in the frontmatter (value + comment) → ambiguous.
    expect(r.status).toBe("ambiguous");
    if (r.status !== "ambiguous") return;
    expect(r.matches).toBe(2);
  });

  // Issue 2 (reviewed): the regex \r?\n---(?:\r?\n|$) requires "---" to appear
  // immediately after a newline with no leading whitespace, so an indented
  // "---" inside a YAML literal-block scalar body does NOT trip the closing-
  // fence detector. The extractor finds the real closing "---" correctly.
  it("correctly ignores indented '---' in a YAML literal-block scalar (extractor is safe)", () => {
    const raw =
      "---\n" +
      "description: |\n" +
      "  line one\n" +
      "  ---\n" +     // indented — does NOT match \n---
      "  line two\n" +
      "default_model: opuss\n" +
      "---\n" +
      "# body\n";
    const r = planBadModelPatch({
      raw,
      path: PATH,
      badName: "opuss",
      replacement: "claude-opus-4-7",
    });
    // Extractor correctly finds the real closing fence; default_model is visible.
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.newText).toContain("default_model: claude-opus-4-7");
  });

  it("returns not-found when the bad name is absent from frontmatter", () => {
    const raw = fm(["default_model: opus"].join("\n"));
    const r = planBadModelPatch({
      raw,
      path: PATH,
      badName: "opuss",
      replacement: "claude-opus-4-7",
    });
    expect(r.status).toBe("not-found");
  });

  it("ignores body occurrences (only frontmatter is patched)", () => {
    const raw = `---\ndefault_model: opus\n---\n# Note about \`opuss\` typo seen earlier.\n`;
    const r = planBadModelPatch({
      raw,
      path: PATH,
      badName: "opuss",
      replacement: "claude-opus-4-7",
    });
    expect(r.status).toBe("not-found");
  });

  it("returns not-found for a file with no frontmatter", () => {
    const r = planBadModelPatch({
      raw: "# heading only\n",
      path: PATH,
      badName: "opuss",
      replacement: "claude-opus-4-7",
    });
    expect(r.status).toBe("not-found");
  });

  it("emits a diff that includes the change", () => {
    const raw = fm(["default_model: opuss"].join("\n"));
    const r = planBadModelPatch({
      raw,
      path: PATH,
      badName: "opuss",
      replacement: "claude-opus-4-7",
    });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.diff).toContain(`--- a/${PATH}`);
    expect(r.diff).toContain(`+++ b/${PATH}`);
    expect(r.diff).toContain("-default_model: opuss");
    expect(r.diff).toContain("+default_model: claude-opus-4-7");
    expect(r.diff).toMatch(/@@ -\d+,\d+ \+\d+,\d+ @@/);
  });

  it("escapes regex metacharacters in the bad name", () => {
    const raw = fm(['default_model: "v1.2+beta"'].join("\n"));
    const r = planBadModelPatch({
      raw,
      path: PATH,
      badName: "v1.2+beta",
      replacement: "v1.2",
    });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.newText).toContain('default_model: "v1.2"');
  });
});

describe("formatUnifiedDiff", () => {
  it("renders a single hunk for a one-line change", () => {
    const a = "alpha\nbravo\ncharlie\n";
    const b = "alpha\nBRAVO\ncharlie\n";
    const d = formatUnifiedDiff(a, b, "x.txt");
    expect(d.split("\n")).toEqual([
      "--- a/x.txt",
      "+++ b/x.txt",
      "@@ -1,3 +1,3 @@",
      " alpha",
      "-bravo",
      "+BRAVO",
      " charlie",
    ]);
  });

  it("returns headers only when texts are identical", () => {
    const d = formatUnifiedDiff("foo\nbar\n", "foo\nbar\n", "x.txt");
    expect(d).toBe("--- a/x.txt\n+++ b/x.txt");
  });

  it("clamps context at the start of the file", () => {
    const a = "alpha\nbravo\n";
    const b = "ALPHA\nbravo\n";
    const d = formatUnifiedDiff(a, b, "x.txt");
    expect(d).toContain("@@ -1,2 +1,2 @@");
    expect(d).toContain("-alpha");
    expect(d).toContain("+ALPHA");
    expect(d).toContain(" bravo");
  });
});

describe("formatBackupTimestamp", () => {
  it("formats UTC time with zero-pad", () => {
    const d = new Date(Date.UTC(2026, 3, 5, 7, 8, 9)); // April 5, 07:08:09 UTC
    expect(formatBackupTimestamp(d)).toBe("20260405-070809");
  });

  it("uses UTC, not local time", () => {
    const d = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
    expect(formatBackupTimestamp(d)).toBe("20260101-000000");
  });

  it("backupPathFor stitches path + timestamp", () => {
    expect(backupPathFor("Projects/x/WORKFLOW.md", "20260101-000000")).toBe(
      "Projects/x/WORKFLOW.md.bak-20260101-000000",
    );
  });
});

describe("findLatestBackup", () => {
  const W = "Projects/x/WORKFLOW.md";

  it("returns the most recent .bak-* by lex sort", () => {
    const siblings = [
      "Projects/x/WORKFLOW.md.bak-20260101-000000",
      "Projects/x/WORKFLOW.md.bak-20260426-122345",
      "Projects/x/WORKFLOW.md.bak-20260301-090000",
      "Projects/x/STATUS.md", // unrelated
    ];
    expect(findLatestBackup(siblings, W)).toBe(
      "Projects/x/WORKFLOW.md.bak-20260426-122345",
    );
  });

  it("returns null when no backup matches", () => {
    expect(findLatestBackup(["Projects/x/STATUS.md"], W)).toBeNull();
    expect(findLatestBackup([], W)).toBeNull();
  });

  it("ignores files with malformed .bak-* suffix", () => {
    const siblings = [
      "Projects/x/WORKFLOW.md.bak-foo",
      "Projects/x/WORKFLOW.md.bak-2026",
      "Projects/x/WORKFLOW.md.bak-20260101-000000",
    ];
    expect(findLatestBackup(siblings, W)).toBe(
      "Projects/x/WORKFLOW.md.bak-20260101-000000",
    );
  });

  it("does not match a .bak-* belonging to a different file", () => {
    const siblings = [
      "Projects/x/OTHER.md.bak-20260426-000000",
      "Projects/x/WORKFLOW.md.bak-20260101-000000",
    ];
    expect(findLatestBackup(siblings, W)).toBe(
      "Projects/x/WORKFLOW.md.bak-20260101-000000",
    );
  });

  it("lex-sorts counter-suffixed backups after plain backups of the same second", () => {
    const siblings = [
      `${W}.bak-20260426-123456`,
      `${W}.bak-20260426-123456-001`,
      `${W}.bak-20260426-123456-002`,
    ];
    // -002 is lexicographically last → most recent
    expect(findLatestBackup(siblings, W)).toBe(`${W}.bak-20260426-123456-002`);
  });
});

describe("parseBackupTimestamp", () => {
  it("extracts the plain timestamp", () => {
    expect(parseBackupTimestamp("Projects/x/WORKFLOW.md.bak-20260426-123456")).toBe(
      "20260426-123456",
    );
  });

  it("extracts a timestamp with counter suffix", () => {
    expect(parseBackupTimestamp("Projects/x/WORKFLOW.md.bak-20260426-123456-001")).toBe(
      "20260426-123456-001",
    );
  });

  it("returns null for a non-backup path", () => {
    expect(parseBackupTimestamp("Projects/x/WORKFLOW.md")).toBeNull();
    expect(parseBackupTimestamp("Projects/x/WORKFLOW.md.bak-foo")).toBeNull();
  });
});
