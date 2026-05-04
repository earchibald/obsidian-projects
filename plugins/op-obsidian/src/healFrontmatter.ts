import { App, TFile } from "obsidian";
import type { IssueStatus } from "./types";

const TERMINAL_ISSUE_STATUS: ReadonlySet<string> = new Set<IssueStatus>(["resolved", "wontfix"]);

const ISSUES_RE = /^Projects\/([^/]+)\/ISSUES\/[^/]+\.md$/;
const RESOLVED_RE = /^Projects\/([^/]+)\/RESOLVED ISSUES\/[^/]+\.md$/;
const TASKS_RE = /^Projects\/([^/]+)\/TASKS\/[^/]+\.md$/;
const ISSUE_ID_RE = /^([A-Z]+-\d+)/;
const TASK_ID_RE = /^([A-Z]+-\d+\.\d+)/;

type Kind = "issue" | "task";

interface Loc {
  kind: Kind;
  project: string;
  /** True only for issues that live in `RESOLVED ISSUES/`. */
  resolvedFolder: boolean;
}

export interface HealResult {
  scanned: number;
  fixed: { path: string; rules: string[] }[];
  errors: { path: string; error: string }[];
}

/**
 * OP-247: scan plugin-managed notes (issues + tasks under `Projects/<slug>/`)
 * for frontmatter drift and auto-repair every drift class for which the truth
 * is unambiguously derivable from the path, filename, or file metadata.
 *
 * Generalizes the OP-221 `healStaleResolvedStatus` pass — that pass's rule
 * (file in RESOLVED ISSUES/ + non-terminal status → resolved) is preserved
 * verbatim here under the same idempotency guarantees, alongside the new
 * rules. Idempotent: re-running on a clean vault yields 0 fixes.
 *
 * Walks the vault directly rather than `IssueStore` because the store rejects
 * notes with missing `type:`/`id:`/`project:`/`status:` — exactly the drift
 * classes we need to detect. Each file gets at most one `processFrontMatter`
 * write; rules compose inside a single callback.
 */
export async function healFrontmatter(app: App): Promise<HealResult> {
  const fixed: HealResult["fixed"] = [];
  const errors: HealResult["errors"] = [];
  const candidates: TFile[] = [];

  for (const file of app.vault.getMarkdownFiles()) {
    if (classify(file.path)) candidates.push(file);
  }

  for (const file of candidates) {
    try {
      let appliedRules: string[] = [];
      await app.fileManager.processFrontMatter(file, (fm) => {
        // OP-270: re-classify at write time. `file.path` is updated by Obsidian
        // whenever the TFile is renamed — a concurrent `runResolve` can move the
        // file to RESOLVED ISSUES/ between this loop iteration's await boundary
        // and the moment the processFrontMatter lock is acquired. Using a `loc`
        // captured before the await would carry a stale `resolvedFolder: false`,
        // causing the `staleTerminal` rule to reset `status` back to `"open"`.
        const loc = classify(file.path);
        if (!loc) return;
        appliedRules = applyRules(fm, file, loc);
      });
      if (appliedRules.length > 0) {
        fixed.push({ path: file.path, rules: appliedRules });
      }
    } catch (err: any) {
      errors.push({ path: file.path, error: err?.message ?? String(err) });
    }
  }

  return { scanned: candidates.length, fixed, errors };
}

function classify(path: string): Loc | null {
  const issuesMatch = path.match(ISSUES_RE);
  if (issuesMatch) return { kind: "issue", project: issuesMatch[1], resolvedFolder: false };
  const resolvedMatch = path.match(RESOLVED_RE);
  if (resolvedMatch)
    return { kind: "issue", project: resolvedMatch[1], resolvedFolder: true };
  const tasksMatch = path.match(TASKS_RE);
  if (tasksMatch) return { kind: "task", project: tasksMatch[1], resolvedFolder: false };
  return null;
}

function applyRules(fm: Record<string, any>, file: TFile, loc: Loc): string[] {
  return loc.kind === "issue" ? applyIssueRules(fm, file, loc) : applyTaskRules(fm, file, loc);
}

function applyIssueRules(fm: Record<string, any>, file: TFile, loc: Loc): string[] {
  const applied: string[] = [];
  const basename = file.basename;

  if (!isNonEmptyString(fm.type)) {
    fm.type = "issue";
    applied.push("issue.type");
  }
  if (!isNonEmptyString(fm.project)) {
    fm.project = loc.project;
    applied.push("issue.project");
  }
  if (!isNonEmptyString(fm.id)) {
    const m = basename.match(ISSUE_ID_RE);
    if (m) {
      fm.id = m[1];
      applied.push("issue.id");
    }
  }
  if (!isNonEmptyString(fm.status)) {
    fm.status = loc.resolvedFolder ? "resolved" : "open";
    applied.push("issue.status.default");
  }
  if (!isNonEmptyString(fm.created)) {
    fm.created = isoDate(file.stat?.ctime) ?? today();
    applied.push("issue.created");
  }
  if (mergeCanonicalTags(fm, loc.project, "issue")) {
    applied.push("issue.tags");
  }

  // OP-221 rule: file in RESOLVED ISSUES/ but status non-terminal →
  // promote status to resolved + backfill `resolved:`. Strip launch_vars,
  // preserve agent metadata (live-agent safety).
  if (loc.resolvedFolder && !TERMINAL_ISSUE_STATUS.has(String(fm.status))) {
    fm.status = "resolved";
    delete fm.launch_vars;
    if (!isNonEmptyString(fm.resolved)) {
      fm.resolved = isoDate(file.stat?.mtime) ?? today();
    }
    applied.push("issue.status.staleResolved");
  }

  // OP-247 inverse: file in ISSUES/ but status terminal → reset to open.
  // Common when a user drags a note out of RESOLVED ISSUES/ to reopen it.
  // Safest reset is `open` since the prior live status is unknowable.
  if (!loc.resolvedFolder && TERMINAL_ISSUE_STATUS.has(String(fm.status))) {
    fm.status = "open";
    applied.push("issue.status.staleTerminal");
  }

  return applied;
}

function applyTaskRules(fm: Record<string, any>, file: TFile, loc: Loc): string[] {
  const applied: string[] = [];
  const basename = file.basename;

  if (!isNonEmptyString(fm.type)) {
    fm.type = "task";
    applied.push("task.type");
  }
  if (!isNonEmptyString(fm.project)) {
    fm.project = loc.project;
    applied.push("task.project");
  }
  if (!isNonEmptyString(fm.id)) {
    const m = basename.match(TASK_ID_RE);
    if (m) {
      fm.id = m[1];
      applied.push("task.id");
    }
  }
  if (!isNonEmptyString(fm.status)) {
    fm.status = "pending";
    applied.push("task.status.default");
  }
  if (mergeCanonicalTags(fm, loc.project, "task")) {
    applied.push("task.tags");
  }

  return applied;
}

/**
 * Ensure `tags:` contains both `project/<slug>` and `<kind>`. Preserves any
 * existing tags. Returns true iff the array was mutated.
 */
function mergeCanonicalTags(fm: Record<string, any>, project: string, kind: Kind): boolean {
  const required = [`project/${project}`, kind];
  const current = Array.isArray(fm.tags)
    ? fm.tags.filter((t: unknown): t is string => typeof t === "string")
    : [];
  const missing = required.filter((t) => !current.includes(t));
  if (missing.length === 0 && Array.isArray(fm.tags)) return false;
  fm.tags = [...current, ...missing];
  return true;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoDate(epochMs: number | undefined): string | undefined {
  if (typeof epochMs !== "number" || !Number.isFinite(epochMs) || epochMs <= 0) return undefined;
  return new Date(epochMs).toISOString().slice(0, 10);
}
