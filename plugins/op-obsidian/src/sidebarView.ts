import { ItemView, TFile, WorkspaceLeaf } from "obsidian";
import type { IssueStore } from "./issueStore";
import type { EventBus } from "./eventBus";
import type { IssueEntry, LifecycleEvent } from "./types";
import type { ViewSettings } from "./settings";

export const OP_SIDEBAR_VIEW_TYPE = "op-sidebar";

type TabId = "issues" | "in-flight" | "resolved";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "issues", label: "Issues" },
  { id: "in-flight", label: "In flight" },
  { id: "resolved", label: "Recently resolved" },
];

const RELEVANT: ReadonlySet<LifecycleEvent["kind"]> = new Set([
  "issue:created",
  "issue:updated",
  "issue:status-changed",
  "issue:deleted",
]);

export class OpSidebarView extends ItemView {
  private active: TabId = "issues";
  private unsubscribe?: () => void;
  private bodyEl!: HTMLElement;
  private tabButtons = new Map<TabId, HTMLElement>();
  private rafPending = false;

  constructor(
    leaf: WorkspaceLeaf,
    private store: IssueStore,
    private bus: EventBus,
    private getSettings: () => ViewSettings,
    private revealAgent?: (entry: IssueEntry) => void | Promise<void>,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return OP_SIDEBAR_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "op: issues";
  }

  getIcon(): string {
    return "list-checks";
  }

  async onOpen(): Promise<void> {
    this.active = this.getSettings().defaultTab;
    const root = this.contentEl;
    root.empty();
    root.addClass("op-sidebar");

    const tabsEl = root.createDiv({ cls: "op-sidebar__tabs" });
    for (const t of TABS) {
      const btn = tabsEl.createEl("button", {
        text: t.label,
        cls: "op-sidebar__tab",
      });
      btn.addEventListener("click", () => {
        this.active = t.id;
        this.render();
      });
      this.tabButtons.set(t.id, btn);
    }

    this.bodyEl = root.createDiv({ cls: "op-sidebar__body" });

    this.unsubscribe = this.bus.on("*", (ev) => {
      if (RELEVANT.has(ev.kind)) this.scheduleRender();
    });

    this.render();
  }

  async onClose(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.tabButtons.clear();
  }

  private scheduleRender(): void {
    if (this.rafPending) return;
    this.rafPending = true;
    requestAnimationFrame(() => {
      this.rafPending = false;
      this.render();
    });
  }

  private render(): void {
    for (const [id, btn] of this.tabButtons) {
      btn.toggleClass("is-active", id === this.active);
    }
    const issues = this.pickFor(this.active);
    this.bodyEl.empty();
    if (issues.length === 0) {
      this.bodyEl.createDiv({ cls: "op-sidebar__empty", text: "(none)" });
      return;
    }
    const ul = this.bodyEl.createEl("ul", { cls: "op-sidebar__list" });
    for (const e of issues) {
      const li = ul.createEl("li", { cls: "op-sidebar__item" });
      const link = li.createEl("a", {
        cls: "op-sidebar__link",
        text: `${e.id} · ${stripIdPrefix(e.title, e.id)}`,
      });
      link.setAttr("href", "#");
      link.addEventListener("click", (ev) => {
        ev.preventDefault();
        void this.openEntry(e);
      });
      const meta = li.createDiv({ cls: "op-sidebar__meta" });
      meta.createSpan({ text: e.project, cls: "op-sidebar__project" });
      if (e.agent) {
        const badge = meta.createEl("a", {
          text: e.agent,
          cls: `op-sidebar__agent op-sidebar__agent--${e.agent}`,
        });
        if (this.revealAgent) {
          badge.setAttr("href", "#");
          badge.setAttr("aria-label", `Reveal ${e.agent} session for ${e.id}`);
          badge.addEventListener("click", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            void this.revealAgent?.(e);
          });
        }
      }
      if (e.priority) {
        meta.createSpan({ text: e.priority, cls: `op-sidebar__prio op-sidebar__prio--${e.priority}` });
      }
      if (this.active === "resolved" && e.resolved) {
        meta.createSpan({ text: e.resolved, cls: "op-sidebar__date" });
      } else if (this.active === "issues" && e.status !== "open") {
        meta.createSpan({ text: e.status, cls: "op-sidebar__status" });
      }
      if (e.githubIssue) {
        const n = ghIssueNumber(e.githubIssue);
        if (n !== undefined) {
          const url = e.githubIssue;
          const gh = meta.createEl("a", {
            cls: "op-sidebar__github",
            text: `GH #${n}`,
          });
          gh.setAttr("href", url);
          gh.setAttr("target", "_blank");
          gh.setAttr("rel", "noopener");
          gh.setAttr("aria-label", `GitHub issue ${url}`);
          gh.addEventListener("click", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            window.open(url, "_blank");
          });
        }
      }
    }
  }

  private pickFor(tab: TabId): IssueEntry[] {
    const all = this.store.issues();
    if (tab === "in-flight") {
      return all
        .filter((e) => e.status === "in-progress" || e.status === "blocked")
        .sort(byId);
    }
    if (tab === "resolved") {
      const limit = this.getSettings().recentResolvedLimit;
      return all
        .filter((e) => e.resolvedFolder || e.status === "resolved" || e.status === "wontfix")
        .sort(byResolvedDesc)
        .slice(0, limit);
    }
    return all
      .filter((e) => !e.resolvedFolder && e.status !== "resolved" && e.status !== "wontfix")
      .sort(byId);
  }

  private async openEntry(entry: IssueEntry): Promise<void> {
    const f = this.app.vault.getAbstractFileByPath(entry.path);
    if (f instanceof TFile) {
      await this.app.workspace.getLeaf(false).openFile(f);
    }
  }
}

function byId(a: IssueEntry, b: IssueEntry): number {
  return a.id.localeCompare(b.id, undefined, { numeric: true });
}

function byResolvedDesc(a: IssueEntry, b: IssueEntry): number {
  const ad = a.resolved ?? "";
  const bd = b.resolved ?? "";
  if (ad !== bd) return bd.localeCompare(ad);
  return b.id.localeCompare(a.id, undefined, { numeric: true });
}

function stripIdPrefix(title: string, id: string): string {
  return title.startsWith(`${id} `) ? title.slice(id.length + 1) : title;
}

function ghIssueNumber(url: string): number | undefined {
  const m = url.match(/\/issues\/(\d+)(?:[/?#]|$)/);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : undefined;
}
