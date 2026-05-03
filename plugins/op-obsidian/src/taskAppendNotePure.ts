// Pure body-append helper for TASK notes. Splits frontmatter from body, glues
// the new payload onto the existing body with a blank-line separator, and
// returns the next file text.
//
// Mirrors the splitFrontmatter / re-glue idiom from setSectionPure but operates
// on the full body (not a specific H2 section) — TASK notes don't have a
// canonical section to target; agents append free-form progress lines.

export interface AppendNoteResult {
  next: string;
  appended: boolean;
}

export function appendTaskBody(text: string, payload: string): AppendNoteResult {
  if (typeof payload !== "string") throw new Error("op-task-append-note: payload must be a string");
  const trimmed = payload.replace(/\r\n/g, "\n").replace(/\s+$/g, "");
  if (!trimmed) throw new Error("op-task-append-note: payload is empty");
  const { frontmatter, body } = splitFrontmatter(text);
  const trimmedBody = body.replace(/\s+$/g, "");
  const newBody = trimmedBody.length > 0 ? `${trimmedBody}\n\n${trimmed}\n` : `${trimmed}\n`;
  return { next: frontmatter + newBody, appended: trimmedBody.length > 0 };
}

function splitFrontmatter(text: string): { frontmatter: string; body: string } {
  if (!text.startsWith("---\n")) return { frontmatter: "", body: text };
  const end = text.indexOf("\n---\n", 4);
  if (end === -1) return { frontmatter: "", body: text };
  const cutoff = end + "\n---\n".length;
  return { frontmatter: text.slice(0, cutoff), body: text.slice(cutoff) };
}
