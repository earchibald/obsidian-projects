const FORBIDDEN = /[#^\[\]|\\/:?"<>*]/g;
const MAX_LEN = 80;

export function sanitizeIssueTitle(title: string): string {
  let s = title.replace(FORBIDDEN, " ");
  s = s.replace(/\s+/g, " ");
  s = s.replace(/^[\s.]+|[\s.]+$/g, "");
  if (s.length > MAX_LEN) {
    s = s.slice(0, MAX_LEN);
    const lastSpace = s.lastIndexOf(" ");
    if (lastSpace > 0) s = s.slice(0, lastSpace);
    s = s.replace(/[\s.]+$/g, "");
  }
  return s;
}

export function issueFilename(id: string, title: string): string {
  const sanitized = sanitizeIssueTitle(title);
  return sanitized.length === 0 ? `${id}.md` : `${id} ${sanitized}.md`;
}
