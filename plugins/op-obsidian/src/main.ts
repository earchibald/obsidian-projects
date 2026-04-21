import { Notice, Plugin, TFile } from "obsidian";
import { EventBus } from "./eventBus";
import { IssueStore } from "./issueStore";
import { createIssue, type CreateIssueInput, type Priority } from "./createIssue";
import { findIssue } from "./findIssue";
import { listProjects } from "./projects";
import {
  AppendCommitModal,
  FindIssueModal,
  IssuePickerModal,
  NewIssueModal,
  ProjectSuggestModal,
  SetPrModal,
} from "./modals";
import { workIssue } from "./workIssue";
import { appendCommit, setPr } from "./commits";
import { writeUriResponse, type UriResponsePayload } from "./uriResponse";
import { runResolve, type ResolveArgs, type ResolveStatus } from "./resolve";
import type { IssueEntry, LifecycleEvent } from "./types";

export default class OpPlugin extends Plugin {
  bus!: EventBus;
  store!: IssueStore;

  async onload(): Promise<void> {
    this.bus = new EventBus();
    this.store = new IssueStore(this.app, this.bus);
    this.addChild(this.store);

    this.bus.on("*", (ev: LifecycleEvent) => {
      console.debug("[op-obsidian]", ev.kind, "entry" in ev ? ev.entry.path : ev.path);
    });

    this.addCommand({
      id: "op-new",
      name: "op: new issue",
      callback: () => this.runNewIssueCommand(),
    });

    this.addCommand({
      id: "op-find-issue",
      name: "op: find issue",
      callback: () => this.runFindIssueCommand(),
    });

    this.addCommand({
      id: "op-work",
      name: "op: work on issue",
      callback: () => this.runWorkCommand(),
    });

    this.addCommand({
      id: "op-append-commit",
      name: "op: append commit to issue",
      callback: () => this.runAppendCommitCommand(),
    });

    this.addCommand({
      id: "op-set-pr",
      name: "op: set PR URL on issue",
      callback: () => this.runSetPrCommand(),
    });

    this.addCommand({
      id: "op-resolve",
      name: "op: resolve issue…",
      callback: async () => {
        const path = this.activeIssuePath();
        if (!path) {
          new Notice("op: open an issue note first");
          return;
        }
        await this.runResolveCommand({ path });
      },
    });

    this.addCommand({
      id: "op-close-current-issue",
      name: "op: close current issue",
      checkCallback: (checking) => {
        const path = this.activeIssuePath();
        if (checking) return !!path;
        if (!path) return false;
        void this.runResolveCommand({ path });
        return true;
      },
    });

    this.addCommand({
      id: "op-dump-store",
      name: "op: dev — dump IssueStore to console",
      callback: () => {
        const issues = this.store.issues();
        const tasks = this.store.tasks();
        console.log("[op-obsidian] IssueStore dump", {
          issues: issues.length,
          tasks: tasks.length,
          entries: [...issues, ...tasks],
        });
        new Notice(`op: ${issues.length} issues, ${tasks.length} tasks (see console)`);
      },
    });

    this.addCommand({
      id: "op-rebuild-store",
      name: "op: dev — rebuild IssueStore",
      callback: () => {
        this.store.rebuild();
        new Notice("op: store rebuilt");
      },
    });

    this.registerObsidianProtocolHandler("op-new", (params) => {
      this.handleOpNewUri(params).catch((err) => {
        console.error("[op-obsidian] op-new URI failed", err);
        new Notice(`op-new failed: ${err.message ?? err}`);
      });
    });

    this.registerObsidianProtocolHandler("op-work", (params) => {
      this.runUri("op-work", params, (p) => this.handleOpWorkUri(p));
    });

    this.registerObsidianProtocolHandler("op-append-commit", (params) => {
      this.runUri("op-append-commit", params, (p) => this.handleOpAppendCommitUri(p));
    });

    this.registerObsidianProtocolHandler("op-set-pr", (params) => {
      this.runUri("op-set-pr", params, (p) => this.handleOpSetPrUri(p));
    });

    this.registerObsidianProtocolHandler("op-resolve", (params) => {
      this.runUri("op-resolve", params, (p) => this.handleOpResolveUri(p, "op-resolve"));
    });

    this.registerObsidianProtocolHandler("op-close-current-issue", (params) => {
      this.runUri("op-close-current-issue", params, (p) =>
        this.handleOpResolveUri(p, "op-close-current-issue", true),
      );
    });

    const resolveFlags = {
      issue: { value: "<id>", description: "Issue id (e.g. OP-24) or vault path" },
      path: { value: "<path>", description: "Vault path to the issue note" },
      status: { value: "<resolved|wontfix>", description: "Target status (default: resolved)" },
      confirmed: { description: "Skip the confirmation modal (default: true for CLI)" },
    };

    this.registerCliHandler(
      "op-resolve",
      "Resolve an issue (status → resolved, move to RESOLVED ISSUES/, trash linked TASKS).",
      resolveFlags,
      (params) => this.handleOpResolveCli(params, "op-resolve", false),
    );

    this.registerCliHandler(
      "op-close-current-issue",
      "Close an issue — same as op-resolve but falls back to the active issue when no id/path given.",
      resolveFlags,
      (params) => this.handleOpResolveCli(params, "op-close-current-issue", true),
    );
  }

  onunload(): void {
    this.bus?.clear();
  }

  private runNewIssueCommand(): void {
    const projects = listProjects(this.app);
    if (projects.length === 0) {
      new Notice("No projects found under Projects/");
      return;
    }
    new ProjectSuggestModal(this.app, projects, (project) => {
      new NewIssueModal(this.app, project, (input) => {
        this.submitCreateIssue(input);
      }).open();
    }).open();
  }

  private runFindIssueCommand(): void {
    new FindIssueModal(this.app, (raw) => {
      const projects = listProjects(this.app);
      const result = findIssue(this.store, { raw, projects });
      if (result.matches.length === 0) {
        new Notice(`op: no match — ${result.interpretation}`);
        return;
      }
      if (result.matches.length === 1) {
        this.openIssue(result.matches[0]);
        return;
      }
      this.pickOneOf(result.matches);
    }).open();
  }

  private pickOneOf(issues: IssueEntry[]): void {
    new IssuePickerModal(this.app, issues, (e) => this.openIssue(e)).open();
  }

  private async openIssue(entry: IssueEntry): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(entry.path);
    if (file instanceof TFile) {
      await this.app.workspace.getLeaf(false).openFile(file);
    } else {
      new Notice(`op: file not found on disk: ${entry.path}`);
    }
  }

  private async submitCreateIssue(input: CreateIssueInput): Promise<void> {
    try {
      const res = await createIssue(this.app, this.store, input);
      new Notice(`Created ${res.id}`);
      const file = this.app.vault.getAbstractFileByPath(res.path);
      if (file instanceof TFile) {
        await this.app.workspace.getLeaf(false).openFile(file);
      }
    } catch (err: any) {
      console.error("[op-obsidian] createIssue failed", err);
      new Notice(`op: create failed — ${err?.message ?? err}`);
    }
  }

  private runWorkCommand(): void {
    this.pickIssueInteractive(async (entry) => {
      try {
        const res = await workIssue(this.app, this.store, entry);
        const extra = res.createdTaskPath ? ` · created ${res.createdTaskPath.split("/").pop()}` : "";
        new Notice(`op-work: ${res.issueId} → in-progress${extra}`);
        await this.openIssue(entry);
      } catch (err: any) {
        console.error("[op-obsidian] op-work failed", err);
        new Notice(`op-work failed: ${err?.message ?? err}`);
      }
    });
  }

  private runAppendCommitCommand(): void {
    this.pickIssueInteractive((entry) => {
      new AppendCommitModal(this.app, entry, async (sha, subject) => {
        try {
          const res = await appendCommit(this.app, entry, { sha, subject });
          new Notice(
            res.added
              ? `op: appended commit to ${res.issueId}`
              : `op: commit already present on ${res.issueId}`,
          );
        } catch (err: any) {
          console.error("[op-obsidian] op-append-commit failed", err);
          new Notice(`op-append-commit failed: ${err?.message ?? err}`);
        }
      }).open();
    });
  }

  private runSetPrCommand(): void {
    this.pickIssueInteractive((entry) => {
      new SetPrModal(this.app, entry, async (url) => {
        try {
          const res = await setPr(this.app, entry, url);
          new Notice(`op: pr set on ${res.issueId}`);
        } catch (err: any) {
          console.error("[op-obsidian] op-set-pr failed", err);
          new Notice(`op-set-pr failed: ${err?.message ?? err}`);
        }
      }).open();
    });
  }

  private pickIssueInteractive(onPick: (entry: IssueEntry) => void): void {
    new FindIssueModal(this.app, (raw) => {
      const projects = listProjects(this.app);
      const result = findIssue(this.store, { raw, projects });
      if (result.matches.length === 0) {
        new Notice(`op: no match — ${result.interpretation}`);
        return;
      }
      if (result.matches.length === 1) {
        onPick(result.matches[0]);
        return;
      }
      new IssuePickerModal(this.app, result.matches, onPick).open();
    }).open();
  }

  private resolveByIdOrThrow(id: string): IssueEntry {
    const entry = this.store
      .issues()
      .find((e) => e.id === id);
    if (!entry) throw new Error(`Issue not found: ${id}`);
    return entry;
  }

  private runUri(
    command: string,
    params: Record<string, string>,
    handler: (params: Record<string, string>) => Promise<UriResponsePayload>,
  ): void {
    handler(params)
      .then((payload) => writeUriResponse(this.app, payload))
      .catch(async (err) => {
        console.error(`[op-obsidian] ${command} URI failed`, err);
        const msg = err?.message ?? String(err);
        new Notice(`${command} failed: ${msg}`);
        await writeUriResponse(this.app, {
          ok: false,
          command,
          error: msg,
          params,
        });
      });
  }

  private async handleOpWorkUri(params: Record<string, string>): Promise<UriResponsePayload> {
    const id = params.id ?? params.issue;
    if (!id) throw new Error("op-work URI requires id");
    const entry = this.resolveByIdOrThrow(id);
    const res = await workIssue(this.app, this.store, entry);
    return {
      ok: true,
      command: "op-work",
      issueId: res.issueId,
      path: res.path,
      previousStatus: res.previousStatus,
      createdTaskPath: res.createdTaskPath,
    };
  }

  private async handleOpAppendCommitUri(
    params: Record<string, string>,
  ): Promise<UriResponsePayload> {
    const id = params.id ?? params.issue;
    const sha = params.sha;
    const subject = params.subject;
    if (!id || !sha || !subject) {
      throw new Error("op-append-commit URI requires id, sha, subject");
    }
    const entry = this.resolveByIdOrThrow(id);
    const res = await appendCommit(this.app, entry, { sha, subject });
    return {
      ok: true,
      command: "op-append-commit",
      issueId: res.issueId,
      path: res.path,
      entry: res.entry,
      added: res.added,
      commits: res.commits,
    };
  }

  private async handleOpSetPrUri(params: Record<string, string>): Promise<UriResponsePayload> {
    const id = params.id ?? params.issue;
    const url = params.url ?? params.pr;
    if (!id || !url) throw new Error("op-set-pr URI requires id and url");
    const entry = this.resolveByIdOrThrow(id);
    const res = await setPr(this.app, entry, url);
    return {
      ok: true,
      command: "op-set-pr",
      issueId: res.issueId,
      path: res.path,
      pr: res.pr,
    };
  }

  private activeIssuePath(): string | undefined {
    const f = this.app.workspace.getActiveFile();
    if (!f) return undefined;
    const entry = this.store.byPath(f.path);
    return entry && entry.type === "issue" ? f.path : undefined;
  }

  private resolveUriArgs(params: Record<string, string>): ResolveArgs {
    const status =
      params.status === "wontfix"
        ? ("wontfix" as ResolveStatus)
        : params.status === "resolved"
          ? ("resolved" as ResolveStatus)
          : undefined;
    return {
      issue: params.issue || params.id || undefined,
      path: params.path || undefined,
      status,
      confirmed: params.confirmed === "1" || params.confirmed === "true",
    };
  }

  private async runResolveCommand(args: ResolveArgs): Promise<void> {
    const command = "op-resolve";
    try {
      const result = await runResolve(this.app, this.store, args);
      await writeUriResponse(this.app, {
        ok: result.ok,
        command,
        issueId: result.issueId,
        path: result.sourcePath,
        movedTo: result.movedTo,
        trashed: result.trashed,
        status: result.status,
        error: result.error,
      });
    } catch (err: any) {
      console.error("[op-obsidian]", command, err);
      const msg = err?.message ?? String(err);
      new Notice(`${command} failed: ${msg}`);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
    }
  }

  private async handleOpResolveCli(
    params: Record<string, string>,
    command: string,
    fallbackActive: boolean,
  ): Promise<string> {
    try {
      const args = this.resolveUriArgs(params);
      // CLI caller is an agent — default to confirmed unless explicitly opted out.
      if (!("confirmed" in params)) args.confirmed = true;
      if (fallbackActive && !args.issue && !args.path) {
        const p = this.activeIssuePath();
        if (p) args.path = p;
      }
      const result = await runResolve(this.app, this.store, args);
      await writeUriResponse(this.app, {
        ok: result.ok,
        command,
        issueId: result.issueId,
        path: result.sourcePath,
        movedTo: result.movedTo,
        trashed: result.trashed,
        status: result.status,
        error: result.error,
      });
      if (!result.ok) return `${command} failed: ${result.error ?? "unknown error"}`;
      const tCount = result.trashed?.length ?? 0;
      return `${command}: ${result.issueId} → ${result.status} · moved to ${result.movedTo} · trashed ${tCount} task(s)`;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[op-obsidian]", command, err);
      await writeUriResponse(this.app, { ok: false, command, error: msg });
      return `${command} failed: ${msg}`;
    }
  }

  private async handleOpResolveUri(
    params: Record<string, string>,
    command: string,
    fallbackActive = false,
  ): Promise<UriResponsePayload> {
    const args = this.resolveUriArgs(params);
    if (fallbackActive && !args.issue && !args.path) {
      const p = this.activeIssuePath();
      if (p) args.path = p;
    }
    const result = await runResolve(this.app, this.store, args);
    if (!result.ok) throw new Error(result.error ?? "resolve failed");
    return {
      ok: true,
      command,
      issueId: result.issueId,
      path: result.sourcePath,
      movedTo: result.movedTo,
      trashed: result.trashed,
      status: result.status,
    };
  }

  private async handleOpNewUri(params: Record<string, string>): Promise<void> {
    const slug = params.project ?? params.slug;
    const title = params.title;
    if (!slug || !title) {
      throw new Error("op-new URI requires project and title");
    }
    const priority = (params.priority as Priority | undefined) ?? "med";
    const scope = collectRepeated(params, "scope");
    const res = await createIssue(this.app, this.store, {
      slug,
      title,
      priority,
      scope,
    });
    new Notice(`Created ${res.id}`);
    const file = this.app.vault.getAbstractFileByPath(res.path);
    if (file instanceof TFile) {
      await this.app.workspace.getLeaf(false).openFile(file);
    }
  }
}

function collectRepeated(params: Record<string, string>, key: string): string[] {
  const single = params[key];
  if (!single) return [];
  return single
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}
