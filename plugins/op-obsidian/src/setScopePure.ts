export function normalizeScopePayload(raw: string): string {
  if (typeof raw !== "string") throw new Error("scope payload must be a string");
  const trimmed = raw.replace(/\r\n/g, "\n").replace(/\s+$/g, "");
  if (!trimmed) throw new Error("scope payload is empty");
  if (/^##\s+/m.test(trimmed)) {
    throw new Error(
      "scope payload must not contain H2 headings (`## ...`) — they would terminate the Scope section",
    );
  }
  return trimmed;
}

export function normalizeBodyPayload(raw: string): string {
  if (typeof raw !== "string") throw new Error("scope payload must be a string");
  const trimmed = raw.replace(/\r\n/g, "\n").replace(/\s+$/g, "");
  if (!trimmed) throw new Error("scope payload is empty");
  return trimmed;
}

export function rewriteFullBody(
  text: string,
  payload: string,
): { next: string; replaced: boolean } {
  const { frontmatter, body } = splitFrontmatter(text);
  const lines = body.split("\n");
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;
  let titlePrefix = "";
  if (i < lines.length && /^#\s+/.test(lines[i])) {
    titlePrefix = `${lines[i]}\n\n`;
    i++;
  }
  const remainder = lines.slice(i).join("\n").trim();
  const replaced = remainder.length > 0;
  const newBody = `${titlePrefix}${payload}\n`;
  return { next: frontmatter + newBody, replaced };
}

export function rewriteScopeSection(
  text: string,
  payload: string,
): { next: string; replaced: boolean } {
  const { frontmatter, body } = splitFrontmatter(text);
  const section = `## Scope\n\n${payload}\n`;

  const lines = body.split("\n");
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+Scope\s*$/.test(lines[i])) {
      startIdx = i;
      break;
    }
  }

  let newBody: string;
  let replaced: boolean;
  if (startIdx === -1) {
    const trimmedBody = body.replace(/\s+$/g, "");
    newBody = trimmedBody.length > 0 ? `${trimmedBody}\n\n${section}` : `${section}`;
    replaced = false;
  } else {
    let endIdx = lines.length;
    for (let i = startIdx + 1; i < lines.length; i++) {
      if (/^##\s+/.test(lines[i])) {
        endIdx = i;
        break;
      }
    }
    const before = lines.slice(0, startIdx).join("\n").replace(/\s+$/g, "");
    const after = lines.slice(endIdx).join("\n").replace(/^\s+/g, "");
    const parts: string[] = [];
    if (before.length > 0) parts.push(before, "");
    parts.push(section.replace(/\n$/, ""));
    if (after.length > 0) parts.push("", after);
    newBody = parts.join("\n");
    if (!newBody.endsWith("\n")) newBody += "\n";
    replaced = true;
  }

  return { next: frontmatter + newBody, replaced };
}

function splitFrontmatter(text: string): { frontmatter: string; body: string } {
  if (!text.startsWith("---\n")) return { frontmatter: "", body: text };
  const end = text.indexOf("\n---\n", 4);
  if (end === -1) return { frontmatter: "", body: text };
  const cutoff = end + "\n---\n".length;
  return { frontmatter: text.slice(0, cutoff), body: text.slice(cutoff) };
}
