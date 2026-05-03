import { App, TFile, normalizePath } from "obsidian";
import { rewriteSection, normalizeSectionPayload } from "./setSectionPure";
import { appendTaskBody } from "./taskAppendNotePure";

export interface DocEditInput {
  /** Vault-relative path to the DOC note. */
  path: string;
  /** Optional H2 section to target. When omitted, replaces full body. */
  section?: string;
  body: string;
  /** When true and `section` is set, append rather than replace. */
  append?: boolean;
}

export interface DocEditResult {
  path: string;
  section?: string;
  replaced: boolean;
  appended: boolean;
  beforeSize: number;
  afterSize: number;
}

/**
 * Edit a vault-only DOC note. Refuses any path under `DOCS/superpowers/`
 * (repo-symlinked tree is governed by the project repo's git workflow).
 *
 * Two modes:
 *   - `section` set → reuse the H2 rewriter from setSectionPure (same fence
 *     handling as op-set-section).
 *   - `section` omitted → append body to file (same idiom as
 *     op-task-append-note); use this when the DOC has no canonical section
 *     structure or the agent wants to add a new top-level paragraph.
 */
export async function docEdit(app: App, input: DocEditInput): Promise<DocEditResult> {
  const path = normalizePath(input.path);
  if (path.includes("/DOCS/superpowers/")) {
    throw new Error(
      "op-doc-edit: refusing to write under DOCS/superpowers/ (repo-symlinked, out of scope)",
    );
  }
  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) {
    throw new Error(`op-doc-edit: file not found at ${path}`);
  }
  const text = await app.vault.read(file);
  let next: string;
  let replaced = false;
  let appended = false;
  if (input.section) {
    const payload = normalizeSectionPayload(input.body, input.section);
    const r = rewriteSection(text, input.section, payload, {
      append: input.append === true,
    });
    next = r.next;
    replaced = r.replaced;
    appended = r.appended;
  } else {
    const r = appendTaskBody(text, input.body);
    next = r.next;
    appended = r.appended;
  }
  if (next !== text) {
    await app.vault.modify(file, next);
  }
  const result: DocEditResult = {
    path,
    replaced,
    appended,
    beforeSize: text.length,
    afterSize: next.length,
  };
  if (input.section) result.section = input.section;
  return result;
}
