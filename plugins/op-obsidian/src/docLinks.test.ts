import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  allDocAnchors,
  allDocFiles,
  diagnosticDocAnchor,
  docUrl,
  sectionDocAnchor,
  type DocAnchor,
} from "./docLinks";

// CI guard for OP-215: every (file, anchor) the in-product help-link
// registry references MUST exist in the doc tree. A doc rename or a
// heading rewrite that drops an anchor surfaces here as a unit-test
// failure rather than a broken "?" icon noticed in production.
//
// Anchor extraction follows GitHub's slugger rules (the slugs Obsidian
// previews and GitHub produce on push):
//   1. Lowercase.
//   2. Strip characters that aren't alphanumeric, `-`, `_`, ` `, or
//      certain unicode letters. (We approximate with ASCII rules
//      because every heading in this repo is ASCII.)
//   3. Collapse runs of whitespace into single spaces.
//   4. Replace spaces with `-`. (Em-dash gets stripped in step 2; the
//      surrounding spaces survive and become consecutive hyphens —
//      GitHub does NOT collapse those.)

const REPO_ROOT = resolve(__dirname, "../../..");

function readDoc(file: string): string {
  return readFileSync(resolve(REPO_ROOT, file), "utf8");
}

/**
 * Approximate github-slugger. Sufficient for ASCII headings; we don't
 * model unicode-letter retention because no heading in this repo uses
 * one. Backticks and other punctuation are stripped.
 */
function slugify(heading: string): string {
  // Mirror github-slugger's per-character whitespace replacement (each
  // run-of-1 whitespace becomes one `-`, NOT collapsed). An em-dash
  // (`—`) gets stripped in the punctuation pass; the spaces that
  // surrounded it survive and become consecutive hyphens, which is
  // why "Injection — foo" → "injection--foo" (double hyphen).
  return heading
    .toLowerCase()
    .replace(/[^\w\- ]+/g, "") // strip punctuation, backticks, em-dashes, …
    .replace(/^\s+|\s+$/g, "")
    .replace(/ /g, "-");
}

/**
 * Pull every H1/H2/H3/H4/H5/H6 line from a markdown file and emit its
 * GitHub-anchored slug. Skips fenced code blocks so a `# comment` line
 * inside ```ts doesn't get mis-parsed as a heading.
 */
function extractAnchors(markdown: string): Set<string> {
  const out = new Set<string>();
  let inFence = false;
  for (const line of markdown.split("\n")) {
    if (line.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    out.add(slugify(m[2]));
  }
  return out;
}

describe("docLinks registry", () => {
  it("references at least one doc file", () => {
    expect(allDocFiles().length).toBeGreaterThan(0);
  });

  it("every referenced doc file exists on disk and is non-empty", () => {
    for (const file of allDocFiles()) {
      const content = readDoc(file);
      expect(content.length, `doc file ${file} is empty`).toBeGreaterThan(0);
    }
  });

  it("every (file, anchor) pair resolves to a heading in the doc", () => {
    const anchorsByFile = new Map<string, Set<string>>();
    for (const file of allDocFiles()) {
      anchorsByFile.set(file, extractAnchors(readDoc(file)));
    }
    const broken: string[] = [];
    for (const target of allDocAnchors()) {
      const anchors = anchorsByFile.get(target.file);
      if (!anchors) {
        broken.push(`${target.file} (file not loaded)`);
        continue;
      }
      if (!anchors.has(target.anchor)) {
        broken.push(`${target.file}#${target.anchor}`);
      }
    }
    if (broken.length > 0) {
      // Surface the full list so a single test failure tells you every
      // anchor that needs a fix, not just the first one.
      throw new Error(
        `Missing doc anchors:\n  - ${broken.join("\n  - ")}\n` +
          `Either add the heading to the doc, or update docLinks.ts to point at an existing one.`,
      );
    }
  });

  it("section help links target real anchors", () => {
    const ids = ["workflows", "workflowsVars", "injection"] as const;
    for (const id of ids) {
      const target = sectionDocAnchor(id);
      expect(target.file).toMatch(/^docs\/workflow-modules\//);
      expect(target.anchor).toMatch(/^[a-z0-9_-]+$/);
    }
  });

  it("every diagnostic code in the registry has a docFooter target", () => {
    const codes = [
      "bad-model",
      "missing-var",
      "unknown-module",
      "schema-mismatch",
      "import-collision",
      "intra-scope-collision",
      "malformed-frontmatter",
      "size-budget",
    ] as const;
    for (const code of codes) {
      const target = diagnosticDocAnchor(code);
      expect(target.file).toBe(
        "docs/workflow-modules/03-troubleshooting.md",
      );
      // Anchor is the kebab-case code itself — keep this contract because
      // that's what the troubleshooting doc declares per H3.
      expect(target.anchor).toBe(code);
    }
  });

  it("docUrl composes a public GitHub URL", () => {
    const target: DocAnchor = {
      file: "docs/workflow-modules/03-troubleshooting.md",
      anchor: "missing-var",
    };
    expect(docUrl(target)).toBe(
      "https://github.com/earchibald/obsidian-projects/blob/main/docs/workflow-modules/03-troubleshooting.md#missing-var",
    );
  });
});
