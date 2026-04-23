import { App, TFile } from "obsidian";
import type { IssueEntry } from "./types";
import { normalizeScopePayload, rewriteScopeSection } from "./setScopePure";

export interface SetScopeResult {
  issueId: string;
  path: string;
  scope: string;
  replaced: boolean;
}

// Replace (or append) the body's `## Scope` section on an issue note.
// Frontmatter and any `# Title` heading are preserved. The payload can be
// arbitrary markdown but must not contain an H2 (`## …`) — that would
// terminate the Scope section.
export async function setScope(
  app: App,
  entry: IssueEntry,
  scope: string,
): Promise<SetScopeResult> {
  const payload = normalizeScopePayload(scope);
  const file = requireFile(app, entry.path);
  const text = await app.vault.read(file);
  const { next, replaced } = rewriteScopeSection(text, payload);
  if (next !== text) {
    await app.vault.modify(file, next);
  }
  return { issueId: entry.id, path: entry.path, scope: payload, replaced };
}

function requireFile(app: App, path: string): TFile {
  const f = app.vault.getAbstractFileByPath(path);
  if (!(f instanceof TFile)) throw new Error(`Issue file not found on disk: ${path}`);
  return f;
}
