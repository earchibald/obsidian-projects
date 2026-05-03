import { App, TFile } from "obsidian";
import type { IssueEntry } from "./types";
import { normalizeSectionPayload, rewriteSection } from "./setSectionPure";

export interface SetTasksResult {
  issueId: string;
  path: string;
  replaced: boolean;
  appended: boolean;
  beforeSize: number;
  afterSize: number;
}

/**
 * Write-through for the issue body's `## Tasks` checklist. Same H2-fence-aware
 * splitter as `setSection` but bypasses its `Plan|Notes|Summary` gate — the
 * Tasks section has its own discipline (`- [ ] <ID>.<N> — <title>` /
 * `- [completed] …`) so it gets a dedicated endpoint rather than being
 * folded into op-set-section.
 *
 * Idempotent: identical payload re-applied is a no-op (no write).
 */
export async function setTasks(
  app: App,
  entry: IssueEntry,
  body: string,
  options: { append?: boolean } = {},
): Promise<SetTasksResult> {
  const file = requireFile(app, entry.path);
  const text = await app.vault.read(file);
  const beforeSize = text.length;
  const payload = normalizeSectionPayload(body, "Tasks");
  const { next, replaced, appended } = rewriteSection(text, "Tasks", payload, {
    append: options.append === true,
  });
  if (next !== text) {
    await app.vault.modify(file, next);
  }
  return {
    issueId: entry.id,
    path: entry.path,
    replaced,
    appended,
    beforeSize,
    afterSize: next.length,
  };
}

function requireFile(app: App, path: string): TFile {
  const f = app.vault.getAbstractFileByPath(path);
  if (!(f instanceof TFile)) throw new Error(`Issue file not found on disk: ${path}`);
  return f;
}
