/**
 * Pure helpers for the quick-capture commands (OP-159 / spec §8).
 *
 * The commands themselves (`op: new from selection` / `op: new from clipboard`)
 * live in main.ts because they need the `App`, the editor, and the navigator
 * clipboard. Anything that doesn't is here so it can be unit-tested without
 * mocking the obsidian module.
 */

import type { ProjectInfo } from "./projects";
import type { RecencyEntry } from "./recencyLog";

const TITLE_MAX = 120;

/**
 * Derive an issue title from a captured text block. Pure-textual:
 *
 *   1. Take the first non-empty line.
 *   2. Strip leading markdown noise: heading markers, list bullets, blockquote
 *      `>`, and task checkboxes. So a captured `## Foo` becomes `Foo`, a
 *      `- [ ] bar` becomes `bar`, a `> quote` becomes `quote`.
 *   3. Collapse internal whitespace.
 *   4. Cap at TITLE_MAX chars (no ellipsis — the user will see the prefill
 *      and can extend if they want).
 *
 * Returns `""` for empty input or whitespace-only input. The caller is
 * expected to leave the modal's title field blank in that case so the
 * existing "title is required" validation forces the user to fill it.
 */
export function deriveTitle(text: string): string {
  if (!text) return "";
  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    // Strip Markdown noise first, then ASCII whitespace, then zero-width /
    // invisible Unicode characters that `String.prototype.trim()` does not
    // remove (U+200B ZERO WIDTH SPACE, U+200C ZWNJ, U+200D ZWJ, U+00AD SOFT
    // HYPHEN, U+FEFF BOM). Without this step a line containing only a ZWS
    // would produce a title that looks blank in the modal but passes the
    // "title is required" validation, silently creating an invisible-titled
    // issue. Using explicit code points rather than a range to be precise.
    const stripped = stripMarkdownNoise(raw).trim().replace(/[\u00AD\u200B\u200C\u200D\uFEFF]/g, "");
    if (stripped.length === 0) continue;
    const collapsed = stripped.replace(/\s+/g, " ");
    return collapsed.length > TITLE_MAX ? collapsed.slice(0, TITLE_MAX).trimEnd() : collapsed;
  }
  return "";
}

function stripMarkdownNoise(line: string): string {
  let out = line;
  // Repeatedly peel a single layer of leading noise so `> - [ ] task` is
  // handled. Cap the depth defensively to avoid pathological inputs looping.
  for (let i = 0; i < 8; i++) {
    const before = out;
    out = out.replace(/^\s+/, "");
    out = out.replace(/^#{1,6}\s+/, "");
    out = out.replace(/^[-*+]\s+/, "");
    out = out.replace(/^>\s?/, "");
    out = out.replace(/^\[[ xX*]\]\s+/, "");
    if (out === before) break;
  }
  return out;
}

export interface PackScopeOpts {
  /** Captured text (selection or clipboard). May be empty/whitespace. */
  text: string;
  /**
   * When the captured text is empty, fall back to a backlink line so the
   * resulting issue at least points at where the user invoked from. Pass the
   * source note's basename (no `.md`) — the wikilink resolver handles the rest.
   */
  fallbackBacklinkTo?: string;
}

/**
 * Build the `scopeBody` (markdown verbatim) the modal will pre-fill into the
 * scope textarea. Returns the empty string if there's nothing to put there
 * (no captured text and no fallback note title).
 *
 * The prose is preserved as-is (including bullets/paragraphs/blockquotes) so
 * that "I selected this paragraph" round-trips through the modal verbatim
 * rather than being shredded into one-bullet-per-line by the bullet parser.
 * The modal switches to `scopeBody` submission when prefill is supplied.
 */
export function packScope({ text, fallbackBacklinkTo }: PackScopeOpts): string {
  const trimmed = (text ?? "").replace(/\s+$/g, "");
  if (trimmed.trim().length > 0) return trimmed;
  if (fallbackBacklinkTo && fallbackBacklinkTo.trim().length > 0) {
    // Strip characters that are syntactically meaningful inside a wikilink so
    // a note named e.g. "Meeting [2026-01]]" does not prematurely close the
    // `[[ … ]]` span and produce a broken or split link.
    const safeTitle = fallbackBacklinkTo.trim().replace(/[[\]|#^]/g, "");
    return `Source: [[${safeTitle}]]`;
  }
  return "";
}

export interface ResolveProjectInput {
  /** `frontmatter.project` from the active note (or undefined). */
  activeProjectSlug?: string;
  recent: ReadonlyArray<RecencyEntry>;
  projects: ReadonlyArray<ProjectInfo>;
}

/**
 * Apply spec §8's project resolution order:
 *   (a) active note's `project:` frontmatter slug (string-equal a known project)
 *   (b) most-recent project from the recency log — derive slug from each
 *       entry's id prefix, advancing past entries whose project no longer
 *       exists (project deleted, prefix renamed)
 *   (c) `null`, meaning the caller should fall through to the interactive
 *       picker
 */
export function resolveCaptureProject(
  input: ResolveProjectInput,
): ProjectInfo | null {
  const projects = input.projects;
  const slug = input.activeProjectSlug?.trim();
  if (slug) {
    const match = projects.find((p) => p.slug === slug);
    if (match) return match;
  }
  for (const entry of input.recent) {
    const prefix = prefixFromId(entry.id);
    if (!prefix) continue;
    const match = projects.find((p) => p.prefix === prefix);
    if (match) return match;
  }
  return null;
}

function prefixFromId(id: string): string | undefined {
  const m = id.match(/^([A-Z][A-Z0-9]*)-\d+$/);
  return m ? m[1] : undefined;
}
