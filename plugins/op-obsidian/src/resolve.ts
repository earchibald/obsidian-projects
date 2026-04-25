import { App, Modal, Notice, Setting, TFile, normalizePath } from "obsidian";
import type { IssueStore } from "./issueStore";
import type { IssueEntry, TaskEntry } from "./types";
import { findIssue } from "./findIssue";
import { listProjects } from "./projects";

export type ResolveStatus = "resolved" | "wontfix";

export interface ResolveArgs {
  issue?: string;
  path?: string;
  status?: ResolveStatus;
  confirmed?: boolean;
  onAfterMove?: (entry: IssueEntry) => Promise<void>;
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

  const today = new Date().toISOString().slice(0, 10);
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm.status = targetStatus;
    fm.resolved = today;
    delete fm.agent;
    delete fm.agent_session;
  });

  await app.fileManager.renameFile(file, targetPath);

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
      new Notice(`op: github close failed — ${githubCloseError}`);
    }
  }

  new Notice(`op: ${entry.id} → ${targetStatus} (${trashed.length} tasks trashed)`);

  return {
    ok: true,
    issueId: entry.id,
    sourcePath: entry.path,
    movedTo: targetPath,
    trashed,
    status: targetStatus,
    githubClosed,
    githubCloseError,
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
