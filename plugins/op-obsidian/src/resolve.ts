import { App, Modal, Setting, TFile, normalizePath } from "obsidian";
import type { IssueStore } from "./issueStore";
import type { IssueEntry, TaskEntry } from "./types";
import { findIssue } from "./findIssue";
import { listProjects } from "./projects";

export type ResolveStatus = "resolved" | "wontfix";

/**
 * Outcome of the optional pre-resolve liveness probe (§5 of OP-149).
 *
 *  - `{ ok: true, alive: true }`  → tmux window for the issue is live; keep `agent:`
 *  - `{ ok: true, alive: false }` → tmux window absent; clear `agent:` (legacy behavior)
 *  - `{ ok: false }`              → probe failed (tmux missing / timeout); keep + warn
 */
export type AgentLivenessResult =
  | { ok: true; alive: boolean }
  | { ok: false };

export interface ResolveArgs {
  issue?: string;
  path?: string;
  status?: ResolveStatus;
  confirmed?: boolean;
  onAfterMove?: (entry: IssueEntry) => Promise<void>;
  /**
   * Single-shot, TOCTOU-safe liveness check for the issue's tmux window.
   * Called once before the frontmatter rewrite when `agent:` is set on the
   * issue. The result decides whether `agent:` and `agent_session:` are
   * deleted (legacy behavior) or kept on the moved file.
   *
   * Optional so unit tests and the CLI handler that have no tmux context
   * can opt out — when omitted, the legacy unconditional clear runs.
   */
  probeAgentLive?: (issueId: string) => Promise<AgentLivenessResult>;
}

export interface ResolveResult {
  ok: boolean;
  issueId?: string;
  sourcePath?: string;
  movedTo?: string;
  trashed?: string[];
  status?: ResolveStatus;
  error?: string;
  githubClosed?: boolean;
  githubCloseError?: string;
  /**
   * `true` when the issue had `agent:` set AND the probe was wired AND we
   * decided to keep it (alive, or probe failed). Callers use this to surface
   * the §5 actionable Notice. `undefined` when no agent was set or no probe
   * was wired (legacy callers).
   */
  agentKept?: boolean;
  /**
   * Mirrors `probeAgentLive`'s `ok` field when the probe ran. `false` means
   * tmux was unreachable — callers warn the user. `undefined` when no probe
   * ran (no agent set on the issue, or the legacy no-probe path).
   */
  agentProbeOk?: boolean;
  /**
   * OP-221: when `processFrontMatter` throws AFTER the rename has already
   * moved the file, runResolve catches the error, continues with task
   * trashing + gh-close, and surfaces the failure here so the caller can
   * warn the user. The startup heal pass (`healFrontmatter`)
   * reconciles the moved file's stale status + missing `resolved:` on
   * next plugin load.
   */
  frontmatterWriteError?: string;
}

export async function runResolve(
  app: App,
  store: IssueStore,
  args: ResolveArgs,
): Promise<ResolveResult> {
  const targetStatus: ResolveStatus = args.status ?? "resolved";

  let entry: IssueEntry | null = null;
  if (args.path) {
    const e = store.byPath(args.path);
    entry = e && e.type === "issue" ? (e as IssueEntry) : null;
  } else if (args.issue) {
    const res = findIssue(store, { raw: args.issue, projects: listProjects(app) });
    if (res.matches.length > 1) {
      return { ok: false, error: `Ambiguous issue "${args.issue}" — ${res.matches.length} matches (${res.interpretation})` };
    }
    entry = res.matches[0] ?? null;
  }

  if (!entry) return { ok: false, error: "Issue not found" };
  if (entry.resolvedFolder) return { ok: false, error: "Already in RESOLVED ISSUES", issueId: entry.id };

  const file = app.vault.getAbstractFileByPath(entry.path);
  if (!(file instanceof TFile)) return { ok: false, error: "Issue file missing", issueId: entry.id };

  const tasks = store.tasks().filter((t) => linksIssue(t, entry));
  const targetDir = `Projects/${entry.project}/RESOLVED ISSUES`;
  const targetPath = normalizePath(`${targetDir}/${file.name}`);

  if (!args.confirmed) {
    const ok = await confirmModal(app, entry, tasks, targetPath, targetStatus);
    if (!ok) return { ok: false, error: "Cancelled", issueId: entry.id };
  }

  if (!(await app.vault.adapter.exists(targetDir))) {
    await app.vault.createFolder(targetDir).catch(() => {});
  }

  // §5: probe tmux liveness BEFORE the frontmatter rewrite so the decision
  // and the write happen in one read-then-write step. The probe itself is
  // TOCTOU-safe (single `tmux list-windows` call) — see `probeLiveTmuxWindows`.
  // SessionEnd-wins: if the agent's session ends after this read but before
  // we write, the SessionEnd hook will subsequently `clearAgentOnIssue` on the
  // moved file. The final state is always correct regardless of race order.
  let agentKept: boolean | undefined;
  let agentProbeOk: boolean | undefined;
  const hadAgent = !!entry.agent;
  if (hadAgent && args.probeAgentLive) {
    try {
      const probe = await args.probeAgentLive(entry.id);
      agentProbeOk = probe.ok;
      // Keep when alive OR when the probe failed (tmux unreachable). Clearing
      // a live agent is the bug we're fixing; clearing on a tmux outage would
      // be the same bug with a different trigger.
      agentKept = probe.ok ? probe.alive : true;
    } catch (err) {
      // Defensive — `probeLiveTmuxWindows` already swallows ENOENT/timeout, so
      // any throw here is a programmer error. Match the "tmux unreachable"
      // semantics rather than dropping the agent silently.
      console.warn("[op-obsidian] resolve probeAgentLive threw", err);
      agentProbeOk = false;
      agentKept = true;
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  // OP-221: rename FIRST, then write frontmatter on the moved file. The
  // previous order (processFrontMatter then renameFile) opened a window
  // where the rename could drop the status update — when the issue file
  // had an open editor view with a dirty buffer (or any pending writer
  // racing with us), Obsidian's rename machinery could re-flush the
  // stale buffer to the new path, reverting the status write but leaving
  // `resolved:` intact (the OP-197 drift state). Doing the write AFTER
  // the rename means our processFrontMatter is unconditionally the last
  // word on the moved file's frontmatter.
  //
  // Safe wrt event handlers: the auto-resolve guard short-circuits on
  // `entry.resolvedFolder` (autoResolveOnStatusChange.ts L31), and the
  // gh-close listener is idempotent. `inFlightResolvePaths` still tracks
  // the source path for belt-and-suspenders.
  await app.fileManager.renameFile(file, targetPath);

  // OP-221: if processFrontMatter throws (malformed YAML, sync-engine
  // lock), we MUST still trash linked tasks and run the gh-close hook.
  // Swallowing here is intentional — the heal pass on next plugin load
  // (`healFrontmatter`) will catch any file that ended up moved
  // with stale status.
  let frontmatterWriteFailed: string | undefined;
  try {
    await app.fileManager.processFrontMatter(file, (fm) => {
      fm.status = targetStatus;
      fm.resolved = today;
      if (!agentKept) {
        delete fm.agent;
        delete fm.agent_session;
      }
      // OP-204 (3d): clear `launch_vars:` so a re-opened resolved issue does
      // not inherit stale Launch overrides from its previous lifecycle.
      delete fm.launch_vars;
    });
  } catch (err: any) {
    frontmatterWriteFailed = err?.message ?? String(err);
    console.error(
      "[op-obsidian] resolve: processFrontMatter failed after rename — heal pass will reconcile on next load",
      targetPath,
      frontmatterWriteFailed,
    );
  }

  const trashed: string[] = [];
  for (const t of tasks) {
    const tf = app.vault.getAbstractFileByPath(t.path);
    if (tf instanceof TFile) {
      await app.vault.trash(tf, true);
      trashed.push(t.path);
    }
  }

  let githubClosed: boolean | undefined;
  let githubCloseError: string | undefined;
  if (args.onAfterMove) {
    try {
      await args.onAfterMove(entry);
      if (entry.githubIssue) githubClosed = true;
    } catch (err: any) {
      githubCloseError = err?.message ?? String(err);
    }
  }

  return {
    ok: true,
    issueId: entry.id,
    sourcePath: entry.path,
    movedTo: targetPath,
    trashed,
    status: targetStatus,
    githubClosed,
    githubCloseError,
    agentKept,
    agentProbeOk,
    frontmatterWriteError: frontmatterWriteFailed,
  };
}

function linksIssue(task: TaskEntry, issue: IssueEntry): boolean {
  if (task.project !== issue.project) return false;
  const link = task.issueLink ?? "";
  if (link.includes(issue.id)) return true;
  const basename = issue.path.split("/").pop()?.replace(/\.md$/, "") ?? "";
  return basename.length > 0 && link.includes(basename);
}

function confirmModal(
  app: App,
  issue: IssueEntry,
  tasks: TaskEntry[],
  targetPath: string,
  targetStatus: ResolveStatus,
): Promise<boolean> {
  return new Promise((resolve) => {
    const modal = new ResolveConfirmModal(app, issue, tasks, targetPath, targetStatus, resolve);
    modal.open();
  });
}

class ResolveConfirmModal extends Modal {
  private decided = false;

  constructor(
    app: App,
    private issue: IssueEntry,
    private tasks: TaskEntry[],
    private targetPath: string,
    private targetStatus: ResolveStatus,
    private done: (ok: boolean) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl, titleEl } = this;
    titleEl.setText(`Resolve ${this.issue.id}?`);

    contentEl.createEl("p", { text: `${this.issue.path}` });
    contentEl.createEl("p", { text: `→ ${this.targetPath}` });

    const ul = contentEl.createEl("ul");
    ul.createEl("li", { text: `status: ${this.issue.status} → ${this.targetStatus}` });
    ul.createEl("li", { text: `resolved: ${new Date().toISOString().slice(0, 10)}` });
    ul.createEl("li", {
      text: `commits: ${this.issue.commits?.length ? `${this.issue.commits.length} entries` : "empty"}`,
    });
    ul.createEl("li", { text: "DOCS/ untouched" });

    contentEl.createEl("p", {
      text: this.tasks.length
        ? `Will trash ${this.tasks.length} TASK note(s):`
        : "No TASK notes linked.",
    });
    if (this.tasks.length) {
      const tul = contentEl.createEl("ul");
      for (const t of this.tasks) tul.createEl("li", { text: t.path });
    }

    new Setting(contentEl)
      .addButton((b) =>
        b.setButtonText("Cancel").onClick(() => {
          this.decided = true;
          this.done(false);
          this.close();
        }),
      )
      .addButton((b) =>
        b
          .setButtonText(`Resolve as ${this.targetStatus}`)
          .setCta()
          .onClick(() => {
            this.decided = true;
            this.done(true);
            this.close();
          }),
      );
  }

  onClose(): void {
    this.contentEl.empty();
    if (!this.decided) this.done(false);
  }
}
