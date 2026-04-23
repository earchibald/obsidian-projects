import { App, TFile } from "obsidian";
import type { IssueEntry } from "./types";
import {
  normalizeBodyPayload,
  normalizeScopePayload,
  rewriteFullBody,
  rewriteScopeSection,
} from "./setScopePure";

export type SetScopeMode = "scope" | "body";

export interface SetScopeOptions {
  mode?: SetScopeMode;
}

export interface SetScopeResult {
  issueId: string;
  path: string;
  scope: string;
  replaced: boolean;
  mode: SetScopeMode;
}

// In `scope` mode (default): replace (or append) the body's `## Scope` section.
// Frontmatter and any `# Title` heading are preserved. Payload must not contain
// an H2 — that would terminate the Scope section.
// In `body` mode: replace the entire body content after the optional `# Title`
// heading with the payload. Payload may contain H2s and arbitrary markdown.
export async function setScope(
  app: App,
  entry: IssueEntry,
  scope: string,
  options: SetScopeOptions = {},
): Promise<SetScopeResult> {
  const mode: SetScopeMode = options.mode ?? "scope";
  const payload = mode === "body" ? normalizeBodyPayload(scope) : normalizeScopePayload(scope);
  const file = requireFile(app, entry.path);
  const text = await app.vault.read(file);
  const { next, replaced } =
    mode === "body" ? rewriteFullBody(text, payload) : rewriteScopeSection(text, payload);
  if (next !== text) {
    await app.vault.modify(file, next);
  }
  return { issueId: entry.id, path: entry.path, scope: payload, replaced, mode };
}

function requireFile(app: App, path: string): TFile {
  const f = app.vault.getAbstractFileByPath(path);
  if (!(f instanceof TFile)) throw new Error(`Issue file not found on disk: ${path}`);
  return f;
}
