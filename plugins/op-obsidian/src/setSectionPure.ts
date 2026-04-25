// Generic per-section body rewriter for issue notes. Powers the op-set-section
// verb, which targets ## Plan / ## Notes / ## Summary — the body sections that
// have no dedicated verb today (## Scope and ## Initial Evaluation each keep
// their own specialised verbs: op-set-scope and op-set-evaluation).
//
// Two modes:
//   - replace (default): swap the section's body for the payload, append the
//     section at end-of-body if missing.
//   - append: glue the payload onto the existing section body with a blank-line
//     separator. Missing section → falls back to create-with-payload.

export const SET_SECTION_NAMES = ["Plan", "Notes", "Summary"] as const;
export type SetSectionName = (typeof SET_SECTION_NAMES)[number];

export function isSetSectionName(name: string): name is SetSectionName {
  return (SET_SECTION_NAMES as readonly string[]).includes(name);
}

// `sectionName` is typed as `string` (not the `SetSectionName` allowlist) so the
// legacy Scope and Initial Evaluation wrappers can delegate here. The public
// op-set-section verb keeps its Plan|Notes|Summary restriction at the
// setSection.ts boundary via `isSetSectionName`.

/**
 * Returns the index of the first line at or after `fromIndex` that starts with
 * `## ` and is NOT inside a fenced code block (``` or ~~~). Returns
 * `lines.length` when no such line exists. Used for both payload validation and
 * section-end detection so that `## ` inside a code fence is never mistaken for
 * a section terminator.
 *
 * Fence tracking rules (CommonMark-compatible):
 *   Opening: a line that starts with 3+ backticks or tildes (info string
 *     allowed after the fence chars); sets `fenceChar` and `fenceLen`.
 *   Closing: a line consisting of ONLY the same fence character, at least as
 *     long as the opener, with only optional trailing whitespace; exits fence
 *     state.  A fence opened with ``` cannot be closed with ~~~, and a shorter
 *     run of the same character is not a valid closer.
 */
function nextH2Outside(lines: string[], fromIndex: number): number {
  let inFence = false;
  let fenceChar = "";
  let fenceLen = 0;
  for (let i = fromIndex; i < lines.length; i++) {
    const line = lines[i];
    if (inFence) {
      // Closing fence: same character, at least as long as the opener, no other
      // non-whitespace characters on the line.
      const m = line.match(/^(`+|~+)\s*$/);
      if (m && m[1][0] === fenceChar && m[1].length >= fenceLen) {
        inFence = false;
        fenceChar = "";
        fenceLen = 0;
      }
    } else {
      const m = line.match(/^(`{3,}|~{3,})/);
      if (m) {
        inFence = true;
        fenceChar = m[1][0];
        fenceLen = m[1].length;
      } else if (/^##\s+/.test(line)) {
        return i;
      }
    }
  }
  return lines.length;
}

/** Returns true when `text` has a `## ` line outside a fenced code block. */
function hasH2OutsideFences(text: string): boolean {
  const lines = text.split("\n");
  return nextH2Outside(lines, 0) < lines.length;
}

export function normalizeSectionPayload(raw: string, sectionName: string): string {
  if (typeof raw !== "string") throw new Error(`${sectionName} payload must be a string`);
  const trimmed = raw.replace(/\r\n/g, "\n").replace(/\s+$/g, "");
  if (!trimmed) throw new Error(`${sectionName} payload is empty`);
  if (hasH2OutsideFences(trimmed)) {
    throw new Error(
      `${sectionName} payload must not contain H2 headings (\`## ...\`) — they would terminate the ${sectionName} section`,
    );
  }
  return trimmed;
}

export interface RewriteSectionOptions {
  // When true, append the payload to the existing section body with a
  // blank-line separator instead of replacing it. Missing section behaves the
  // same as replace (creates the section with the payload).
  append?: boolean;
}

export interface RewriteSectionResult {
  next: string;
  // Whether the section already existed before this call. False when the
  // section was appended at end-of-body.
  replaced: boolean;
  // True when append=true and we appended onto existing content; false when we
  // either replaced (append=false) or created the section fresh.
  appended: boolean;
}

export function rewriteSection(
  text: string,
  sectionName: string,
  payload: string,
  options: RewriteSectionOptions = {},
): RewriteSectionResult {
  const { frontmatter, body } = splitFrontmatter(text);
  const heading = `## ${sectionName}`;
  const headingRe = new RegExp(`^##\\s+${escapeRegExp(sectionName)}\\s*$`);

  const lines = body.split("\n");
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (headingRe.test(lines[i])) {
      startIdx = i;
      break;
    }
  }

  if (startIdx === -1) {
    const section = `${heading}\n\n${payload}\n`;
    const trimmedBody = body.replace(/\s+$/g, "");
    const newBody = trimmedBody.length > 0 ? `${trimmedBody}\n\n${section}` : section;
    return { next: frontmatter + newBody, replaced: false, appended: false };
  }

  const endIdx = nextH2Outside(lines, startIdx + 1);

  const append = options.append === true;
  let newSectionBody: string;
  let appended = false;
  if (append) {
    const existingLines = lines.slice(startIdx + 1, endIdx);
    const existingBody = existingLines.join("\n").replace(/^\s+|\s+$/g, "");
    if (existingBody.length > 0) {
      newSectionBody = `${existingBody}\n\n${payload}`;
      appended = true;
    } else {
      newSectionBody = payload;
    }
  } else {
    newSectionBody = payload;
  }

  const section = `${heading}\n\n${newSectionBody}\n`;
  const before = lines.slice(0, startIdx).join("\n").replace(/\s+$/g, "");
  const after = lines.slice(endIdx).join("\n").replace(/^\s+/g, "");
  const parts: string[] = [];
  if (before.length > 0) parts.push(before, "");
  parts.push(section.replace(/\n$/, ""));
  if (after.length > 0) parts.push("", after);
  let newBody = parts.join("\n");
  if (!newBody.endsWith("\n")) newBody += "\n";
  return { next: frontmatter + newBody, replaced: true, appended };
}

function splitFrontmatter(text: string): { frontmatter: string; body: string } {
  if (!text.startsWith("---\n")) return { frontmatter: "", body: text };
  const end = text.indexOf("\n---\n", 4);
  if (end === -1) return { frontmatter: "", body: text };
  const cutoff = end + "\n---\n".length;
  return { frontmatter: text.slice(0, cutoff), body: text.slice(cutoff) };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
