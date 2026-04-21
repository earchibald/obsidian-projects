import { Notice, Plugin, TFile } from "obsidian";
import { EventBus } from "./eventBus";
import { IssueStore } from "./issueStore";
import { createIssue, type CreateIssueInput, type Priority } from "./createIssue";
import { findIssue } from "./findIssue";
import { listProjects } from "./projects";
import { FindIssueModal, IssuePickerModal, NewIssueModal, ProjectSuggestModal } from "./modals";
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
