import { App, TFile, Component, CachedMetadata, EventRef } from "obsidian";
import type { EventBus } from "./eventBus";
import type {
  IssueEntry,
  IssueStatus,
  StoreEntry,
  TaskEntry,
  TaskStatus,
} from "./types";

const PROJECTS_ROOT = "Projects/";

export class IssueStore extends Component {
  private entries = new Map<string, StoreEntry>();
  private refs: EventRef[] = [];

  constructor(private app: App, private bus: EventBus) {
    super();
  }

  onload(): void {
    this.app.workspace.onLayoutReady(() => this.rebuild());

    const mc = this.app.metadataCache;
    this.refs.push(
      mc.on("changed", (file) => this.handleChange(file)),
      mc.on("deleted", (file) => this.handleDelete(file.path)),
    );

    const vault = this.app.vault;
    this.refs.push(
      vault.on("rename", (file, oldPath) => this.handleRename(file, oldPath)),
      vault.on("delete", (file) => this.handleDelete(file.path)),
    );
  }

  onunload(): void {
    const mc = this.app.metadataCache;
    const vault = this.app.vault;
    for (const ref of this.refs) {
      mc.offref(ref);
      vault.offref(ref);
    }
    this.refs = [];
    this.entries.clear();
  }

  rebuild(): void {
    this.entries.clear();
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (!file.path.startsWith(PROJECTS_ROOT)) continue;
      const cache = this.app.metadataCache.getFileCache(file);
      const entry = this.parse(file, cache);
      if (entry) this.entries.set(file.path, entry);
    }
  }

  all(): StoreEntry[] {
    return Array.from(this.entries.values());
  }

  issues(): IssueEntry[] {
    return this.all().filter((e): e is IssueEntry => e.type === "issue");
  }

  tasks(): TaskEntry[] {
    return this.all().filter((e): e is TaskEntry => e.type === "task");
  }

  byPath(path: string): StoreEntry | undefined {
    return this.entries.get(path);
  }

  byId(id: string): StoreEntry | undefined {
    for (const e of this.entries.values()) {
      if ("id" in e && e.id === id) return e;
    }
    return undefined;
  }

  private handleChange(file: TFile): void {
    if (!file.path.startsWith(PROJECTS_ROOT)) return;
    const cache = this.app.metadataCache.getFileCache(file);
    const next = this.parse(file, cache);
    const prev = this.entries.get(file.path);

    if (!next) {
      if (prev) this.handleDelete(file.path);
      return;
    }

    this.entries.set(file.path, next);

    if (!prev) {
      this.bus.emit(
        next.type === "issue"
          ? { kind: "issue:created", entry: next }
          : { kind: "task:created", entry: next },
      );
      return;
    }

    if (prev.type !== next.type) {
      // type flipped — treat as delete + create
      this.emitDelete(file.path, prev);
      this.bus.emit(
        next.type === "issue"
          ? { kind: "issue:created", entry: next }
          : { kind: "task:created", entry: next },
      );
      return;
    }

    if (next.type === "issue" && prev.type === "issue") {
      if (prev.status !== next.status) {
        this.bus.emit({ kind: "issue:status-changed", entry: next, prev: prev.status });
      }
      this.bus.emit({ kind: "issue:updated", entry: next, prev });
    } else if (next.type === "task" && prev.type === "task") {
      if (prev.status !== next.status) {
        this.bus.emit({ kind: "task:status-changed", entry: next, prev: prev.status });
      }
      this.bus.emit({ kind: "task:updated", entry: next, prev });
    }
  }

  private handleRename(file: TFile | { path: string }, oldPath: string): void {
    const prev = this.entries.get(oldPath);
    if (prev) this.entries.delete(oldPath);
    if (file instanceof TFile) this.handleChange(file);
  }

  private handleDelete(path: string): void {
    const prev = this.entries.get(path);
    if (!prev) return;
    this.entries.delete(path);
    this.emitDelete(path, prev);
  }

  private emitDelete(path: string, prev: StoreEntry): void {
    this.bus.emit(
      prev.type === "issue"
        ? { kind: "issue:deleted", path, prev }
        : { kind: "task:deleted", path, prev },
    );
  }

  private parse(file: TFile, cache: CachedMetadata | null): StoreEntry | null {
    const fm = cache?.frontmatter;
    if (!fm) return null;
    const type = fm.type;
    if (type === "issue") return this.parseIssue(file, fm);
    if (type === "task") return this.parseTask(file, fm);
    return null;
  }

  private parseIssue(file: TFile, fm: Record<string, unknown>): IssueEntry | null {
    const id = str(fm.id);
    const project = str(fm.project);
    const status = str(fm.status);
    if (!id || !project || !status) return null;
    const inResolved = file.path.includes("/RESOLVED ISSUES/");
    return {
      path: file.path,
      type: "issue",
      id,
      project,
      status: status as IssueStatus,
      priority: str(fm.priority) as IssueEntry["priority"],
      created: str(fm.created),
      resolved: str(fm.resolved),
      assignee: str(fm.assignee),
      commits: arr(fm.commits),
      pr: str(fm.pr),
      githubIssue: str(fm.github_issue),
      agent: str(fm.agent),
      title: file.basename,
      resolvedFolder: inResolved,
    };
  }

  private parseTask(file: TFile, fm: Record<string, unknown>): TaskEntry | null {
    const id = str(fm.id);
    const project = str(fm.project);
    const status = str(fm.status);
    if (!id || !project || !status) return null;
    return {
      path: file.path,
      type: "task",
      id,
      issueLink: str(fm.issue),
      project,
      status: status as TaskStatus,
      title: file.basename,
    };
  }
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function arr(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v.filter((x): x is string => typeof x === "string");
}
