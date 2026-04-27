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
    // Backfill `resolved:` with the file's mtime when the field is missing
    // (catch-path scenario in `runResolve`: rename succeeded but the
    // frontmatter write threw, so neither `status:` nor `resolved:` was
    // ever applied). mtime ≈ rename time on the moved file, which is the
    // closest proxy to the original resolve moment. Falls back to today
    // if stat is unavailable.
    const fallbackResolved = isoDate(file.stat?.mtime) ?? today();
    // `launch_vars:` is pure settings — no live process attached — so
    // clearing it is safe and matches `runResolve`'s cleanup.
    // We deliberately do NOT touch `agent:` / `agent_session:` here:
    // copilot review #4 — a long-running agent attached to a drifted
    // file would be orphaned by an unconditional clear. The OP-156 §5
    // keep-alive logic in `runResolve` and the sidebar In flight tab
    // already handle agent+resolvedFolder cases correctly; users can
    // detach a stale agent via the existing command.
    try {
      await app.fileManager.processFrontMatter(file, (fm) => {
        fm.status = "resolved";
        delete fm.launch_vars;
        if (typeof fm.resolved !== "string" || fm.resolved.length === 0) {
          fm.resolved = fallbackResolved;
        }
      });
      fixed.push({ path: e.path, from: e.status });
    } catch (err: any) {
      errors.push({ path: e.path, error: err?.message ?? String(err) });
    }
  }
  return { scanned: issues.length, fixed, errors };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoDate(epochMs: number | undefined): string | undefined {
  if (typeof epochMs !== "number" || !Number.isFinite(epochMs) || epochMs <= 0) return undefined;
  return new Date(epochMs).toISOString().slice(0, 10);
}
