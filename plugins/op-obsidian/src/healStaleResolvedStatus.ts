import { App, TFile } from "obsidian";
import type { IssueStore } from "./issueStore";
import type { IssueStatus } from "./types";

const TERMINAL: ReadonlySet<IssueStatus> = new Set<IssueStatus>(["resolved", "wontfix"]);

export interface HealResult {
  scanned: number;
  fixed: { path: string; from: IssueStatus }[];
  errors: { path: string; error: string }[];
}

/**
 * OP-221: scan all issues; for any whose file lives in `RESOLVED ISSUES/`
 * but whose `status:` frontmatter is non-terminal, rewrite
 * `status: resolved`.
 *
 * Fixes the data-drift state observed in the wild on OP-197 (file moved to
 * RESOLVED ISSUES/, `resolved:` written, but `status:` left as `in-progress`)
 * caused by a race between `processFrontMatter` and `renameFile` in the
 * pre-OP-221 ordering of `runResolve`. The race itself is fixed in
 * `resolve.ts` (rename → write); this pass cleans up legacy drift on first
 * load. Idempotent — re-running on a clean vault is a no-op.
 */
export async function healStaleResolvedStatus(
  app: App,
  store: IssueStore,
): Promise<HealResult> {
  const issues = store.issues();
  const drift = issues.filter((e) => e.resolvedFolder && !TERMINAL.has(e.status));
  const fixed: HealResult["fixed"] = [];
  const errors: HealResult["errors"] = [];
  for (const e of drift) {
    const file = app.vault.getAbstractFileByPath(e.path);
    if (!(file instanceof TFile)) {
      errors.push({ path: e.path, error: "file not found in vault" });
      continue;
    }
    try {
      await app.fileManager.processFrontMatter(file, (fm) => {
        fm.status = "resolved";
        // Mirror runResolve's frontmatter cleanup: a drifted file may also
        // carry zombie `agent:` / `agent_session:` / `launch_vars:` entries
        // that the original resolve flow would have removed but that the
        // race left in place. Clearing them here keeps the healed file in
        // a state indistinguishable from a clean resolve.
        delete fm.agent;
        delete fm.agent_session;
        delete fm.launch_vars;
        // Gemini review #2 (2nd pass): if `resolved:` is missing too
        // (resolve.ts catch-path scenario where processFrontMatter threw
        // before either field was written), set today as a best-effort
        // fallback. It may be off by hours/days from the actual rename
        // time, but a missing date breaks downstream sort/filter/query
        // semantics; today's date is recoverable, absence is not.
        if (typeof fm.resolved !== "string" || fm.resolved.length === 0) {
          fm.resolved = new Date().toISOString().slice(0, 10);
        }
      });
      fixed.push({ path: e.path, from: e.status });
    } catch (err: any) {
      errors.push({ path: e.path, error: err?.message ?? String(err) });
    }
  }
  return { scanned: issues.length, fixed, errors };
}
