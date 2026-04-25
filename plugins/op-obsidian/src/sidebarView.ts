import { ItemView, TFile, WorkspaceLeaf, prepareFuzzySearch, setIcon, setTooltip } from "obsidian";
import type { IssueStore } from "./issueStore";
import type { EventBus } from "./eventBus";
import type { IssueEntry, LifecycleEvent } from "./types";
import type { ViewSettings } from "./settings";
import type { AgentLaunchMode } from "./agentProfiles";
import type { RecencyEntry } from "./recencyLog";
import { mostRecent, relativeTime } from "./recencyLog";
import { probeLiveTmuxWindows } from "./staleAgentBadges";
import { tmuxWindowName } from "./terminalLaunch";

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

/** How often the sidebar re-checks tmux for live agent windows, in ms. */
export const TMUX_PROBE_INTERVAL_MS = 5_000;

/**
 * Adapter wired in from `main.ts` so the sidebar can read the recency log,
 * record a fresh touch when the user clicks a row, and call `op: resume last`
 * (the chip's click handler) without depending on the plugin class directly.
 *
 * Optional in the constructor so existing tests that don't exercise this
 * surface keep working unchanged.
 */
export interface OpSidebarHooks {
  getRecent: () => ReadonlyArray<RecencyEntry>;
  tmuxBinary: () => string;
  /** Sessions to probe — typically the shared session plus per-iTerm-window
   * derivatives from the orchestrator registry. Mirrors what the cleanup
   * path passes around. */
  tmuxSessions: () => string[];
  recordRecency: (issueId: string) => Promise<void>;
  executeResumeLast: () => void;
}

export class OpSidebarView extends ItemView {
  private active: TabId = "issues";
  private unsubscribe?: () => void;
  private headerEl!: HTMLElement;
  private bodyEl!: HTMLElement;
  private filterInput!: HTMLInputElement;
  private filterQuery = "";
  private tabButtons = new Map<TabId, HTMLElement>();
  private rafPending = false;
  private probeTimer: ReturnType<typeof setInterval> | undefined;
  /** `undefined` means "not yet probed" — render renders all badges as
   * normal until the first tick lands. `null` means "tmux unavailable",
   * which also keeps badges as-is (no false-positive demotion). A `Set`
   * means we know which windows are live and any agent: that points
   * elsewhere is rendered with the muted "stale" class. */
  private liveTmuxWindows: Set<string> | null | undefined = undefined;

  constructor(
    leaf: WorkspaceLeaf,
    private store: IssueStore,
    private bus: EventBus,
    private getSettings: () => ViewSettings,
    private revealAgent?: (entry: IssueEntry) => void | Promise<void>,
    private launchAgent?: (
      entry: IssueEntry,
      mode: AgentLaunchMode,
      forcePick: boolean,
    ) => void | Promise<void>,
    private hooks?: OpSidebarHooks,
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

    this.headerEl = root.createDiv({ cls: "op-sidebar__header" });

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

    this.filterInput = root.createEl("input", {
      cls: "op-sidebar__filter",
      attr: {
        type: "search",
        placeholder: "Filter issues…",
        "aria-label": "Filter issues",
        spellcheck: "false",
      },
    });
    this.filterInput.addEventListener("input", () => {
      this.filterQuery = this.filterInput.value;
      this.scheduleRender();
    });

    this.bodyEl = root.createDiv({ cls: "op-sidebar__body" });

    this.unsubscribe = this.bus.on("*", (ev) => {
      if (RELEVANT.has(ev.kind)) this.scheduleRender();
    });

    this.startTmuxProbe();
    this.render();
  }

  async onClose(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.stopTmuxProbe();
    this.tabButtons.clear();
  }

  /**
   * Public hook so tests (and future commands) can force a refresh without
   * waiting for the 5s timer or for an event-bus message.
   */
  refresh(): void {
    this.scheduleRender();
  }

  /** Visible for tests: are we currently running the periodic probe? */
  isProbeRunning(): boolean {
    return this.probeTimer !== undefined;
  }

  private startTmuxProbe(): void {
    if (this.probeTimer !== undefined) return; // no double-start
    if (!this.hooks) return; // legacy callers (tests) don't supply hooks
    if (process.platform !== "darwin") return; // macOS-only per OP-150 spec
    // Kick off an immediate first probe so the initial render reflects
    // reality instead of waiting up to 5s for the first interval tick.
    void this.tickTmuxProbe();
    this.probeTimer = setInterval(() => void this.tickTmuxProbe(), TMUX_PROBE_INTERVAL_MS);
  }

  private stopTmuxProbe(): void {
    if (this.probeTimer === undefined) return;
    clearInterval(this.probeTimer);
    this.probeTimer = undefined;
  }

  private async tickTmuxProbe(): Promise<void> {
    if (!this.hooks) return;
    try {
      const probe = await probeLiveTmuxWindows(this.hooks.tmuxBinary(), this.hooks.tmuxSessions());
      const next = probe.ok ? probe.live : null;
      if (sameLiveSet(this.liveTmuxWindows, next)) return;
      this.liveTmuxWindows = next;
      this.scheduleRender();
    } catch (err) {
      // probeLiveTmuxWindows already swallows ENOENT/timeout; anything that
      // bubbles here is a real bug (e.g. invalid binary path), so log and
      // fall through to "tmux unavailable".
      console.debug("[op-obsidian] sidebar tmux probe threw", err);
      if (this.liveTmuxWindows !== null) {
        this.liveTmuxWindows = null;
        this.scheduleRender();
      }
    }
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
    this.renderHeader();
    for (const [id, btn] of this.tabButtons) {
      btn.toggleClass("is-active", id === this.active);
    }
    const issues = filterEntries(this.pickFor(this.active), this.filterQuery);
    this.bodyEl.empty();
    if (issues.length === 0) {
      const emptyText = this.filterQuery.trim() ? "(no matches)" : "(none)";
      this.bodyEl.createDiv({ cls: "op-sidebar__empty", text: emptyText });
      return;
    }
    const ul = this.bodyEl.createEl("ul", { cls: "op-sidebar__list" });
    for (const e of issues) {
      const li = ul.createEl("li", { cls: "op-sidebar__item" });
      const headerRow = li.createDiv({ cls: "op-sidebar__row" });
      const linkText = `${e.id} · ${stripIdPrefix(e.title, e.id)}`;
      const link = headerRow.createEl("a", {
        cls: "op-sidebar__link",
        text: linkText,
      });
      link.setAttr("href", "#");
      setTooltip(link, linkText, { delay: 250 });
      link.addEventListener("click", (ev) => {
        ev.preventDefault();
        if (this.hooks) void this.hooks.recordRecency(e.id);
        void this.openEntry(e);
      });
      const actions = headerRow.createDiv({ cls: "op-sidebar__actions" });
      if (e.agent) {
        const stale = this.isAgentBadgeStale(e);
        const classes = [
          "op-sidebar__agent",
          `op-sidebar__agent--${e.agent}`,
          stale ? "op-sidebar__agent--stale is-stale" : "",
        ]
          .filter(Boolean)
          .join(" ");
        const badge = actions.createEl("a", {
          text: e.agent,
          cls: classes,
        });
        if (stale) {
          badge.setAttr("aria-label", `Stale agent badge for ${e.id} — tmux window not found`);
          setTooltip(badge, "Stale: no live tmux window", { delay: 250 });
        }
        if (this.revealAgent) {
          badge.setAttr("href", "#");
          if (!stale) {
            badge.setAttr("aria-label", `Reveal ${e.agent} session for ${e.id}`);
          }
          badge.addEventListener("click", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            void this.revealAgent?.(e);
          });
        }
      } else if (this.launchAgent) {
        const launchBtn = actions.createEl("button", {
          cls: "op-sidebar__action op-sidebar__action--launch",
        });
        setIcon(launchBtn, "play");
        launchBtn.setAttr("aria-label", `Launch agent for ${e.id}`);
        launchBtn.setAttr("title", "Launch agent (cmd/ctrl-click to pick agent)");
        launchBtn.addEventListener("click", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          void this.launchAgent?.(e, "implement", ev.metaKey || ev.ctrlKey);
        });
        const planBtn = actions.createEl("button", {
          cls: "op-sidebar__action op-sidebar__action--plan",
        });
        setIcon(planBtn, "clipboard-list");
        planBtn.setAttr("aria-label", `Launch agent in plan mode for ${e.id}`);
        planBtn.setAttr("title", "Launch agent (plan mode) (cmd/ctrl-click to pick agent)");
        planBtn.addEventListener("click", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          void this.launchAgent?.(e, "plan", ev.metaKey || ev.ctrlKey);
        });
      }
      const meta = li.createDiv({ cls: "op-sidebar__meta" });
      meta.createSpan({ text: e.project, cls: "op-sidebar__project" });
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

  private renderHeader(): void {
    if (!this.headerEl) return;
    this.headerEl.empty();
    const head = this.hooks ? mostRecent(this.hooks.getRecent()) : undefined;
    if (!head) {
      this.headerEl.toggleClass("is-empty", true);
      return;
    }
    this.headerEl.toggleClass("is-empty", false);
    const entry = this.store.byId(head.id);
    const isIssue = entry && entry.type === "issue";
    const agentLabel = isIssue && (entry as IssueEntry).agent
      ? this.agentLabelForChip(entry as IssueEntry)
      : "no agent";
    const rel = relativeTime(head.at);
    const text = `Last touched: ${head.id} · ${agentLabel}${rel ? ` · ${rel}` : ""}`;
    const chip = this.headerEl.createEl("a", {
      cls: "op-sidebar__last-touched",
      text,
      attr: {
        href: "#",
        "aria-label": `Resume ${head.id}`,
      },
    });
    chip.addEventListener("click", (ev) => {
      ev.preventDefault();
      this.hooks?.executeResumeLast();
    });
  }

  private agentLabelForChip(entry: IssueEntry): string {
    const stale = this.isAgentBadgeStale(entry);
    if (stale) return `${entry.agent} (stale)`;
    if (this.liveTmuxWindows && this.liveTmuxWindows.has(tmuxWindowName(entry.id))) {
      return `${entry.agent} attached`;
    }
    return entry.agent ?? "no agent";
  }

  /**
   * Pure-ish: does this issue's `agent:` badge claim a live session that
   * tmux actually doesn't have? Returns false when we have no idea
   * (initial state, tmux unavailable, no tmux info yet) so we never
   * surface a false-positive "stale" indicator.
   */
  private isAgentBadgeStale(entry: IssueEntry): boolean {
    if (!entry.agent) return false;
    if (entry.resolvedFolder) return false;
    if (entry.status === "resolved" || entry.status === "wontfix") return false;
    if (!this.liveTmuxWindows) return false; // unknown → don't demote
    return !this.liveTmuxWindows.has(tmuxWindowName(entry.id));
  }

  private pickFor(tab: TabId): IssueEntry[] {
    const all = this.store.issues();
    if (tab === "in-flight") {
      return all
        .filter((e) => e.status === "in-progress" || e.status === "blocked" || !!e.agent)
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

function sameLiveSet(
  prev: Set<string> | null | undefined,
  next: Set<string> | null,
): boolean {
  if (prev === undefined) return false;
  if (prev === null && next === null) return true;
  if (prev === null || next === null) return false;
  if (prev.size !== next.size) return false;
  for (const v of prev) if (!next.has(v)) return false;
  return true;
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

type MatcherFactory = (query: string) => (text: string) => unknown;

export function filterEntries(
  entries: IssueEntry[],
  query: string,
  makeMatcher: MatcherFactory = prepareFuzzySearch,
): IssueEntry[] {
  const q = query.trim();
  if (!q) return entries;
  const match = makeMatcher(q);
  return entries.filter((e) => {
    const target = `${e.id} ${stripIdPrefix(e.title, e.id)} ${e.project}`;
    return match(target) !== null;
  });
}

function ghIssueNumber(url: string): number | undefined {
  const m = url.match(/\/issues\/(\d+)(?:[/?#]|$)/);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : undefined;
}
