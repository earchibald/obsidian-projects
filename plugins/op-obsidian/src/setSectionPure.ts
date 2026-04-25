// Generic per-section body rewriter for issue notes. Powers the op-set-section
// verb, which targets ## Plan / ## Notes / ## Summary — the body sections that
// have no dedicated verb today (## Scope and ## Initial Evaluation keep their
// specialised verbs because they carry mode=body / bullet-handling concerns).
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

export function normalizeSectionPayload(raw: string, sectionName: SetSectionName): string {
  if (typeof raw !== "string") throw new Error(`${sectionName} payload must be a string`);
  const trimmed = raw.replace(/\r\n/g, "\n").replace(/\s+$/g, "");
  if (!trimmed) throw new Error(`${sectionName} payload is empty`);
  if (/^##\s+/m.test(trimmed)) {
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
  sectionName: SetSectionName,
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

  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      endIdx = i;
      break;
    }
  }

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
