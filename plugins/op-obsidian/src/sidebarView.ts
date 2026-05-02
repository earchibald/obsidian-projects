import { App, ItemView, Menu, Modal, TFile, WorkspaceLeaf, prepareFuzzySearch, setIcon, setTooltip } from "obsidian";
import type { IssueStore } from "./issueStore";
import type { EventBus } from "./eventBus";
import type { IssueEntry, LifecycleEvent } from "./types";
import type { ResolveStatus } from "./resolve";
import type { SidebarDensity, ViewSettings } from "./settings";
import type { AgentLaunchMode } from "./agentProfiles";
import type { RecencyEntry } from "./recencyLog";
import { mostRecent, relativeTime } from "./recencyLog";
import { probeLiveTmuxWindows } from "./staleAgentBadges";
import { tmuxWindowName } from "./terminalLaunch";

export const OP_SIDEBAR_VIEW_TYPE = "op-sidebar";

type TabId = "issues" | "in-flight" | "resolved";
type SidebarSearchKey = "project" | "status" | "priority" | "agent" | "has";

interface SidebarSearchFilter {
  key: SidebarSearchKey;
  value: string;
}

export const SIDEBAR_SEARCH_HELP = [
  {
    key: "project:<slug|PREFIX>",
    description: "Match a project by slug or issue prefix.",
    example: "project:OP",
  },
  {
    key: "status:<open|in-progress|blocked|resolved|wontfix>",
    description: "Filter by issue status.",
    example: "status:blocked",
  },
  {
    key: "priority:<low|med|high>",
    description: "Filter by priority.",
    example: "priority:high",
  },
  {
    key: "agent:<name|none>",
    description: "Filter by attached agent, or rows without one.",
    example: "agent:copilot",
  },
  {
    key: "has:<pr|github|agent|commits>",
    description: "Require a populated field on the issue.",
    example: "has:pr",
  },
] as const;

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
  /** Trigger the same code path as `op-resolve` (Notice + post-move chip
   * included). Called from the `r` keyboard shortcut and the row context
   * menu. The optional `status` selects between the default `resolved` and
   * `wontfix` — both flow through `runResolve`'s confirmation modal, so the
   * caller never bypasses confirmation. Optional so tests can omit it. */
  resolveIssue?: (entry: IssueEntry, status?: ResolveStatus) => void | Promise<void>;
  /** Reopen a resolved/wontfix issue. The backing `op-reopen-issue` command
   * does not exist yet — main.ts leaves this `undefined` so the contextmenu
   * builder omits the item. A future PR wires the command and lights it up
   * automatically. */
  reopenIssue?: (entry: IssueEntry) => void | Promise<void>;
  /** Detach an attached agent from a row (kill its tmux window, clear
   * `agent:`). Backed by §5's pending `op: detach agent` command — left
   * `undefined` until that lands. */
  detachAgent?: (entry: IssueEntry) => void | Promise<void>;
  /** Open the row's `github_issue:` URL in the system browser. Wired through
   * a hook (rather than touching `window` directly) so the sidebar stays
   * testable and the menu builder stays pure. */
  openGithubIssue?: (entry: IssueEntry) => void;
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
  /** Guard against `r` auto-repeat (or rapid double-tap) stacking multiple
   * resolve modals on top of each other. Set when a modal opens, cleared via
   * the `onDismiss` callback when it closes (Cancel OR Resolve). */
  private resolveModalOpen = false;
  /** Last list rendered into the body — keyed by index so j/k can map cleanly
   * onto a row without re-running the filter. */
  private displayedIssues: IssueEntry[] = [];
  /** -1 ⇒ no row selected (empty list). Otherwise an index into
   * {@link displayedIssues}. Clamped on every render. */
  private selectedIndex = -1;
  private rowEls: HTMLElement[] = [];
  private keydownHandler?: (ev: KeyboardEvent) => void;
  /** `undefined` means "not yet probed" — render renders all badges as
   * normal until the first tick lands. `null` means "tmux unavailable",
   * which also keeps badges as-is (no false-positive demotion). A `Set`
   * means we know which windows are live and any agent: that points
   * elsewhere is rendered with the muted "stale" class. */
  private liveTmuxWindows: Set<string> | null | undefined = undefined;

  /** Single popover element owned by the view; rebuilt per hover. */
  private hoverEl?: HTMLElement;
  private hoverTimer: ReturnType<typeof setTimeout> | undefined;
  /** Monotonic counter so a stale in-flight capture is ignored after the
   * pointer has moved on. Bumped on every hover-start and hover-end. */
  private hoverSeq = 0;
  private hoverDocClickHandler: ((ev: MouseEvent) => void) | undefined;

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
    private capturePreview?: (entry: IssueEntry) => Promise<string | null>,
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
    // Make the leaf focusable so j/k/Enter/r work without first clicking a
    // row. tabindex=0 keeps the leaf in the natural Tab order so users can
    // also reach it via keyboard from elsewhere in Obsidian; we additionally
    // focus it programmatically in onOpen.
    root.setAttr("tabindex", "0");

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

    const filterRow = root.createDiv({ cls: "op-sidebar__filter-row" });
    this.filterInput = filterRow.createEl("input", {
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
    const filterHelp = filterRow.createEl("button", {
      cls: "op-sidebar__filter-help",
      text: "?",
      attr: {
        type: "button",
        "aria-label": "Sidebar search help",
      },
    });
    setTooltip(filterHelp, sidebarSearchHelpText(), { delay: 250 });

    this.bodyEl = root.createDiv({ cls: "op-sidebar__body" });

    this.unsubscribe = this.bus.on("*", (ev) => {
      if (RELEVANT.has(ev.kind)) this.scheduleRender();
    });

    this.keydownHandler = (ev) => this.handleKeydown(ev);
    root.addEventListener("keydown", this.keydownHandler);

    this.startTmuxProbe();
    this.render();
    // Defer the focus until after Obsidian finishes its layout pass, otherwise
    // the workspace re-grabs focus and the keydown listener never sees keys.
    queueMicrotask(() => root.focus({ preventScroll: true }));
  }

  async onClose(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.stopTmuxProbe();
    this.teardownHoverPreview();
    this.tabButtons.clear();
    if (this.keydownHandler) {
      this.contentEl.removeEventListener("keydown", this.keydownHandler);
      this.keydownHandler = undefined;
    }
    this.rowEls = [];
    this.displayedIssues = [];
    this.selectedIndex = -1;
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
    // The list is about to be rebuilt; any popover anchored to the previous
    // DOM is now dangling. Tear it down before re-rendering so we don't
    // orphan a `position: fixed` element on top of the new list.
    this.teardownHoverPreview();
    this.renderHeader();
    for (const [id, btn] of this.tabButtons) {
      btn.toggleClass("is-active", id === this.active);
    }
    const density = this.getSettings().density;
    this.contentEl.toggleClass("op-sidebar--density-compact", density === "compact");
    this.contentEl.toggleClass("op-sidebar--density-comfortable", density !== "compact");

    const issues = filterEntries(this.pickFor(this.active), this.filterQuery);
    // Preserve selection identity across re-renders by id. Without this, a new
    // issue that sorts before the current selection (e.g. OP-001 arriving
    // while OP-100 is highlighted at index 0) silently shifts the highlight
    // to a different row mid-keypress. O(n) findIndex is fine — renders are
    // RAF-debounced and project-vault issue lists are small.
    const selectedId = this.displayedIssues[this.selectedIndex]?.id;
    this.displayedIssues = issues;
    this.rowEls = [];
    const identityIdx = selectedId !== undefined ? issues.findIndex((e) => e.id === selectedId) : -1;
    if (issues.length === 0) this.selectedIndex = -1;
    else if (identityIdx >= 0) this.selectedIndex = identityIdx;
    else if (this.selectedIndex < 0 || this.selectedIndex >= issues.length) this.selectedIndex = 0;

    const showProjectChip = shouldShowProjectChip(density, issues);

    this.bodyEl.empty();
    if (issues.length === 0) {
      const emptyText = this.filterQuery.trim() ? "(no matches)" : "(none)";
      this.bodyEl.createDiv({ cls: "op-sidebar__empty", text: emptyText });
      return;
    }
    const ul = this.bodyEl.createEl("ul", { cls: "op-sidebar__list" });
    for (let idx = 0; idx < issues.length; idx++) {
      const e = issues[idx];
      const li = ul.createEl("li", { cls: "op-sidebar__item" });
      // OP-156 §5: a row in the In flight tab whose issue is already resolved
      // (the agent session outlived `op-resolve`) renders as muted +
      // strikethrough so the user can see at a glance which entries are
      // "agent still attached but issue closed."
      const resolvedLive = this.active === "in-flight" && isResolved(e) && !!e.agent;
      if (resolvedLive) li.addClass("op-sidebar__item--resolved-live");
      const headerRow = li.createDiv({ cls: "op-sidebar__row" });
      if (idx === this.selectedIndex) headerRow.addClass("is-selected");
      this.rowEls.push(headerRow);
      const ctxItemIndex = idx;
      headerRow.addEventListener("contextmenu", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this.setSelectedIndex(ctxItemIndex, { scroll: false });
        this.openRowContextMenu(e, ev);
      });
      const linkText = `${e.id} · ${stripIdPrefix(e.title, e.id)}`;
      const link = headerRow.createEl("a", {
        cls: "op-sidebar__link",
        text: linkText,
      });
      link.setAttr("href", "#");
      setTooltip(link, linkText, { delay: 250 });
      const itemIndex = idx;
      link.addEventListener("click", (ev) => {
        ev.preventDefault();
        this.setSelectedIndex(itemIndex, { scroll: false });
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
        this.attachHoverPreview(badge, e);
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
      if (showProjectChip) {
        meta.createSpan({ text: e.project, cls: "op-sidebar__project" });
      }
      if (e.priority) {
        meta.createSpan({ text: e.priority, cls: `op-sidebar__prio op-sidebar__prio--${e.priority}` });
      }
      if (this.active === "resolved" && e.resolved) {
        meta.createSpan({ text: e.resolved, cls: "op-sidebar__date" });
      } else if (this.active === "issues" && e.status !== "open") {
        meta.createSpan({ text: e.status, cls: "op-sidebar__status" });
      } else if (resolvedLive) {
        meta.createSpan({
          text: e.status === "wontfix" ? "wontfix" : "resolved",
          cls: "op-sidebar__resolved-chip",
        });
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
      if (e.pr) {
        const n = prNumber(e.pr);
        if (n !== undefined) {
          const url = e.pr;
          const pr = meta.createEl("a", {
            cls: "op-sidebar__pr",
            text: `PR #${n}`,
          });
          pr.setAttr("href", url);
          pr.setAttr("target", "_blank");
          pr.setAttr("rel", "noopener");
          pr.setAttr("aria-label", `Pull request ${url}`);
          pr.addEventListener("click", (ev) => {
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
    return pickIssuesForTab(this.store.issues(), tab, {
      liveTmuxWindows: this.liveTmuxWindows,
      recentResolvedLimit: this.getSettings().recentResolvedLimit,
    });
  }

  private async openEntry(entry: IssueEntry): Promise<void> {
    const f = this.app.vault.getAbstractFileByPath(entry.path);
    if (f instanceof TFile) {
      await this.app.workspace.getLeaf(false).openFile(f);
    }
  }

  /**
   * Single source of truth for selection state. Updates the rendered
   * `.is-selected` class on the row elements without re-running render(),
   * scrolls the new row into view (default), and clamps to the visible range.
   */
  private setSelectedIndex(next: number, opts: { scroll?: boolean } = {}): void {
    const last = this.displayedIssues.length - 1;
    if (last < 0) {
      this.selectedIndex = -1;
      return;
    }
    const clamped = Math.max(0, Math.min(last, next));
    if (clamped === this.selectedIndex) return;
    if (this.selectedIndex >= 0 && this.rowEls[this.selectedIndex]) {
      this.rowEls[this.selectedIndex].removeClass("is-selected");
    }
    this.selectedIndex = clamped;
    const el = this.rowEls[this.selectedIndex];
    if (el) {
      el.addClass("is-selected");
      if (opts.scroll !== false) el.scrollIntoView({ block: "nearest" });
    }
  }

  /**
   * Keyboard router. Two contexts in priority order:
   *
   *   1. Filter input focused — only navigation/open/launch keys (Arrows,
   *      Enter, Cmd/Ctrl+Enter); letter keys (`j`/`k`/`r`) fall through
   *      so typing a query stays unobstructed.
   *   2. Anywhere else inside the sidebar — full set including `j`/`k`/`r`.
   *
   * Modifier rule: only the bare modifier set documented per binding triggers
   * the action. `Cmd+J` is a global Obsidian shortcut so we never claim it;
   * `Shift+J` falls through too. The handler uses `preventDefault()` only
   * after deciding to act, so unknown keys propagate normally.
   */
  private handleKeydown(ev: KeyboardEvent): void {
    if (ev.isComposing) return;
    const action = decideKeyAction(ev, { inFilter: ev.target === this.filterInput });
    if (action === "ignore") return;
    ev.preventDefault();
    // For Cmd/Ctrl+Enter we additionally stopPropagation so Obsidian's global
    // "Open link in new pane" handler doesn't double-fire on the same chord.
    if (action === "launch") ev.stopPropagation();
    switch (action) {
      case "next":
        this.setSelectedIndex(this.selectedIndex + 1);
        return;
      case "prev":
        this.setSelectedIndex(this.selectedIndex - 1);
        return;
      case "open":
        void this.activateSelected();
        return;
      case "launch":
        void this.launchSelected();
        return;
      case "resolve":
        void this.resolveSelected();
        return;
    }
  }

  private currentSelection(): IssueEntry | undefined {
    if (this.selectedIndex < 0) return undefined;
    return this.displayedIssues[this.selectedIndex];
  }

  private async activateSelected(): Promise<void> {
    const entry = this.currentSelection();
    if (!entry) return;
    if (this.hooks) await this.hooks.recordRecency(entry.id);
    await this.openEntry(entry);
  }

  private async launchSelected(): Promise<void> {
    const entry = this.currentSelection();
    if (!entry || !this.launchAgent) return;
    if (entry.agent) return; // a live agent already exists; don't double-launch
    await this.launchAgent(entry, "implement", false);
  }

  private async resolveSelected(): Promise<void> {
    // Guard against `r` auto-repeat (or rapid double-tap) stacking modals.
    // Cleared via the modal's onDismiss callback below.
    if (this.resolveModalOpen) return;
    const entry = this.currentSelection();
    if (!entry || !this.hooks?.resolveIssue) return;
    if (entry.resolvedFolder || entry.status === "resolved" || entry.status === "wontfix") {
      return;
    }
    this.resolveModalOpen = true;
    const hook = this.hooks.resolveIssue;
    const modal = new OpResolveConfirmModal(
      this.app,
      entry,
      async () => {
        await hook(entry);
      },
      () => {
        this.resolveModalOpen = false;
      },
    );
    modal.open();
  }

  /**
   * Attach mouseenter/mouseleave handlers to an agent badge so that
   * hovering it shows a tmux pane preview popover after the configured
   * delay. Skips wiring entirely when the feature is disabled or no
   * capture callback is supplied (legacy callers / tests).
   */
  private attachHoverPreview(badge: HTMLElement, entry: IssueEntry): void {
    const settings = this.getSettings();
    if (!settings.agentHoverPreview) return;
    if (!this.capturePreview) return;
    const capture = this.capturePreview;

    badge.addEventListener("mouseenter", () => {
      const seq = ++this.hoverSeq;
      const delay = clampHoverDelay(settings.agentHoverDelayMs);
      this.clearHoverTimer();
      this.hoverTimer = setTimeout(() => {
        this.hoverTimer = undefined;
        if (seq !== this.hoverSeq) return;
        void capture(entry).then((text) => {
          // Stale request? Pointer has already moved on or another hover
          // started — drop this result rather than racing to render it.
          if (seq !== this.hoverSeq) return;
          if (text === null || text === undefined) return;
          this.showHoverPreview(badge, text);
        });
      }, delay);
    });

    badge.addEventListener("mouseleave", () => {
      this.teardownHoverPreview();
    });
  }

  private showHoverPreview(anchor: HTMLElement, text: string): void {
    // Replace any existing popover so we never stack two. keepSeq=true so the
    // seq counter is NOT bumped — the current capture is still live.
    this.teardownHoverPreview(/* keepSeq */ true);

    const el = document.createElement("div");
    el.addClass("op-sidebar__hover-preview");
    const pre = document.createElement("pre");
    pre.textContent = text;
    el.appendChild(pre);
    document.body.appendChild(el);

    const rect = anchor.getBoundingClientRect();
    el.style.position = "fixed";
    el.style.left = `${Math.round(rect.left)}px`;
    el.style.top = `${Math.round(rect.bottom + 4)}px`;

    this.hoverEl = el;

    // Click-outside dismissal: any document click closes the popover. We
    // attach to `document` (not the leaf) so a click in another pane also
    // dismisses it. Use capture phase to beat downstream stopPropagation.
    const handler = (ev: MouseEvent) => {
      if (ev.target instanceof Node && el.contains(ev.target)) return;
      this.teardownHoverPreview();
    };
    this.hoverDocClickHandler = handler;
    document.addEventListener("click", handler, true);
  }

  /**
   * Cancel any pending hover timer, invalidate any in-flight capture (by
   * bumping `hoverSeq`), and remove the popover + document click listener.
   *
   * Pass `keepSeq = true` only when replacing one popover with another within
   * the same hover sequence (i.e. called from `showHoverPreview` itself) —
   * this skips the seq bump so the current capture is not cancelled.
   */
  private teardownHoverPreview(keepSeq = false): void {
    if (!keepSeq) {
      this.hoverSeq++; // invalidate any in-flight tmux capture
      this.clearHoverTimer();
    }
    if (this.hoverEl) {
      this.hoverEl.remove();
      this.hoverEl = undefined;
    }
    if (this.hoverDocClickHandler) {
      document.removeEventListener("click", this.hoverDocClickHandler, true);
      this.hoverDocClickHandler = undefined;
    }
  }

  private clearHoverTimer(): void {
    if (this.hoverTimer !== undefined) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = undefined;
    }
  }

  /**
   * Build and show the right-click context menu for a sidebar row. The menu
   * dispatches existing flows (each one opens its own confirmation modal where
   * destructive); the menu itself never bypasses confirmation. Item visibility
   * is decided by {@link buildSidebarMenuItems} so the conditional matrix is
   * unit-testable without an Obsidian DOM.
   */
  private openRowContextMenu(entry: IssueEntry, ev: MouseEvent): void {
    if (!this.hooks) return;
    const items = buildSidebarMenuItems(entry, this.hooks);
    if (items.length === 0) return;
    const menu = new Menu();
    for (const item of items) {
      menu.addItem((mi) => {
        mi.setTitle(item.title);
        if (item.icon) mi.setIcon(item.icon);
        mi.onClick(() => {
          void item.run();
        });
      });
    }
    menu.showAtMouseEvent(ev);
  }
}

/**
 * Confirmation gate for the `r` keyboard shortcut. Tiny on purpose — the real
 * resolve work happens in `runResolveCommand` via the wired hook. We only
 * stand between an accidental keypress and the irreversible move-to-RESOLVED.
 */
export class OpResolveConfirmModal extends Modal {
  constructor(
    app: App,
    private entry: IssueEntry,
    private onConfirm: () => void | Promise<void>,
    /** Called when the modal closes for any reason (Cancel, Resolve, or
     * Esc/click-outside). The sidebar uses it to clear the auto-repeat
     * stacking guard so the next `r` keypress works normally. */
    private onDismiss?: () => void,
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: `Resolve ${this.entry.id}?` });
    const title = stripIdPrefix(this.entry.title, this.entry.id);
    contentEl.createEl("p", {
      text: title,
      cls: "setting-item-description",
    });
    contentEl.createEl("p", {
      text: "This moves the note to RESOLVED ISSUES/, sets status to resolved, trashes linked TASKS, and (if configured) closes the linked GitHub issue.",
      cls: "setting-item-description",
    });

    const buttons = contentEl.createDiv({ cls: "op-resolve-confirm__buttons" });
    const cancel = buttons.createEl("button", { text: "Cancel" });
    cancel.addEventListener("click", () => this.close());
    const resolve = buttons.createEl("button", { text: "Resolve", cls: "mod-cta" });
    resolve.addEventListener("click", () => {
      this.close();
      void this.onConfirm();
    });
    // Default focus on Resolve so Enter inside the modal confirms.
    queueMicrotask(() => resolve.focus());
  }

  onClose(): void {
    this.contentEl.empty();
    this.onDismiss?.();
  }
}

export type SidebarKeyAction =
  | "ignore"
  | "next"
  | "prev"
  | "open"
  | "launch"
  | "resolve";

/**
 * Pure key-router decision. Inputs: the keyboard event and whether the filter
 * input owns focus. Output: the action label the view should perform, or
 * `"ignore"` to let the key propagate untouched.
 *
 * Lifted out of the class so the binding map is unit-testable without a DOM.
 */
export function decideKeyAction(
  ev: Pick<KeyboardEvent, "key" | "altKey" | "shiftKey" | "metaKey" | "ctrlKey">,
  opts: { inFilter: boolean },
): SidebarKeyAction {
  const { key, altKey, shiftKey, metaKey, ctrlKey } = ev;
  const meta = metaKey || ctrlKey;
  const plain = !altKey && !shiftKey && !metaKey && !ctrlKey;

  if (key === "ArrowDown" && plain) return "next";
  if (key === "ArrowUp" && plain) return "prev";
  if (key === "Enter" && plain) return "open";
  if (key === "Enter" && meta && !altKey && !shiftKey) return "launch";

  // Letter shortcuts: skipped when the filter input owns focus so typing a
  // query stays unobstructed.
  if (opts.inFilter) return "ignore";
  if (key === "j" && plain) return "next";
  if (key === "k" && plain) return "prev";
  if (key === "r" && plain) return "resolve";

  return "ignore";
}

/**
 * One menu item the sidebar's right-click handler should add. `run` is the
 * async dispatch the menu fires when the user clicks; `icon` is an Obsidian
 * lucide icon name (optional). Plain data so the conditional matrix can be
 * unit-tested without an Obsidian Menu DOM.
 */
export interface SidebarMenuItem {
  /** Stable key for tests — independent of the visible `title`. */
  key:
    | "resolve"
    | "resolve-wontfix"
    | "reopen"
    | "detach-agent"
    | "open-github-issue";
  title: string;
  icon?: string;
  run: () => void | Promise<void>;
}

/**
 * Build the ordered list of right-click menu items for a sidebar row. Each
 * item is conditional on (a) the row's current state — e.g. no `Reopen` on an
 * open issue, no `Open GitHub issue` when the row has no `github_issue:` —
 * and (b) whether the matching hook is wired. `reopenIssue` and `detachAgent`
 * are wired only when their backing commands exist (a future PR for reopen;
 * §5 for detach agent), so today those items naturally drop off the menu.
 */
export function buildSidebarMenuItems(
  entry: IssueEntry,
  hooks: OpSidebarHooks,
): SidebarMenuItem[] {
  const items: SidebarMenuItem[] = [];
  const isResolved =
    entry.resolvedFolder || entry.status === "resolved" || entry.status === "wontfix";

  if (!isResolved && hooks.resolveIssue) {
    const resolve = hooks.resolveIssue;
    items.push({
      key: "resolve",
      title: "Resolve…",
      icon: "check-circle",
      run: () => resolve(entry, "resolved"),
    });
    items.push({
      key: "resolve-wontfix",
      title: "Resolve as wontfix…",
      icon: "x-circle",
      run: () => resolve(entry, "wontfix"),
    });
  }

  if (isResolved && hooks.reopenIssue) {
    const reopen = hooks.reopenIssue;
    items.push({
      key: "reopen",
      title: "Reopen",
      icon: "rotate-ccw",
      run: () => reopen(entry),
    });
  }

  if (entry.agent && hooks.detachAgent) {
    const detach = hooks.detachAgent;
    items.push({
      key: "detach-agent",
      title: "Detach agent",
      icon: "unplug",
      run: () => detach(entry),
    });
  }

  if (entry.githubIssue && hooks.openGithubIssue) {
    const open = hooks.openGithubIssue;
    items.push({
      key: "open-github-issue",
      title: "Open GitHub issue",
      icon: "external-link",
      run: () => open(entry),
    });
  }

  return items;
}

/**
 * Decide whether to render the per-row project chip given the current density
 * preference and the rendered list. Pure helper for unit tests; the sidebar
 * caches the result per render and skips the chip when this returns false.
 *
 * The chip stays visible in `comfortable` regardless. In `compact`, it's only
 * suppressed when every rendered row is from the same project — repeating it
 * down a single-project list is the noise we're trying to remove.
 */
export function shouldShowProjectChip(
  density: SidebarDensity,
  entries: ReadonlyArray<IssueEntry>,
): boolean {
  if (density !== "compact") return true;
  if (entries.length === 0) return true;
  const first = entries[0].project;
  for (let i = 1; i < entries.length; i++) {
    if (entries[i].project !== first) return true;
  }
  return false;
}

function clampHoverDelay(ms: number): number {
  if (!Number.isFinite(ms)) return 400;
  if (ms <= 0) return 0;
  if (ms >= 2000) return 2000;
  return Math.floor(ms);
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

function isResolved(e: IssueEntry): boolean {
  return e.resolvedFolder || e.status === "resolved" || e.status === "wontfix";
}

/**
 * Pure: classify an issue list into the entries shown for `tab`.
 *
 *  - `issues`     → everything not resolved.
 *  - `in-flight`  → in-progress / blocked AND any resolved-with-agent row whose
 *                   tmux window is still live (per OP-156 §5). Unknown-tmux
 *                   (`undefined`/`null`) does not hide rows — same rule as
 *                   {@link OpSidebarView.isAgentBadgeStale}.
 *                   The folder-resolved check runs BEFORE the status check so a
 *                   row that lives in `RESOLVED ISSUES/` but still carries a
 *                   non-terminal `status:` (data drift like OP-197) is treated
 *                   as resolved — the folder is the source of truth here.
 *  - `resolved`   → resolved/wontfix, sorted by resolved-date desc, sliced to
 *                   `opts.recentResolvedLimit`.
 */
export function pickIssuesForTab(
  issues: ReadonlyArray<IssueEntry>,
  tab: TabId,
  opts: {
    liveTmuxWindows: Set<string> | null | undefined;
    recentResolvedLimit: number;
  },
): IssueEntry[] {
  if (tab === "in-flight") {
    return issues
      .filter((e) => {
        if (isResolved(e)) {
          if (!e.agent) return false;
          if (!opts.liveTmuxWindows) return true;
          return opts.liveTmuxWindows.has(tmuxWindowName(e.id));
        }
        if (e.status === "in-progress" || e.status === "blocked") return true;
        if (!e.agent) return false;
        return true;
      })
      .sort(byId);
  }
  if (tab === "resolved") {
    return issues
      .filter((e) => isResolved(e))
      .sort(byResolvedDesc)
      .slice(0, opts.recentResolvedLimit);
  }
  return issues.filter((e) => !isResolved(e)).sort(byId);
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

export function sidebarSearchHelpText(): string {
  return [
    "Search keys",
    ...SIDEBAR_SEARCH_HELP.map((item) => `${item.key} — ${item.description} Example: ${item.example}`),
    "Combine keys with free text, e.g. project:OP sidebar",
  ].join("\n");
}

export function filterEntries(
  entries: IssueEntry[],
  query: string,
  makeMatcher: MatcherFactory = prepareFuzzySearch,
): IssueEntry[] {
  const q = query.trim();
  if (!q) return entries;
  const parsed = parseSidebarSearchQuery(q);
  if (parsed.filters.length === 0) {
    const legacyMatch = makeMatcher(q);
    return entries.filter((e) => legacyMatch(fuzzyTarget(e)) !== null);
  }
  const match = parsed.textQuery ? makeMatcher(parsed.textQuery) : undefined;
  return entries.filter((e) => {
    if (!parsed.filters.every((filter) => matchesSidebarSearchFilter(e, filter))) return false;
    if (!match) return true;
    return match(fuzzyTarget(e)) !== null;
  });
}

function fuzzyTarget(entry: IssueEntry): string {
  return `${entry.id} ${stripIdPrefix(entry.title, entry.id)} ${entry.project}`;
}

function parseSidebarSearchQuery(query: string): {
  filters: SidebarSearchFilter[];
  textQuery: string;
} {
  const filters: SidebarSearchFilter[] = [];
  const text: string[] = [];
  for (const token of query.split(/\s+/).filter(Boolean)) {
    const parsed = parseSidebarSearchToken(token);
    if (parsed) {
      filters.push(parsed);
      continue;
    }
    text.push(fallbackSearchText(token));
  }
  return {
    filters,
    textQuery: text.filter(Boolean).join(" "),
  };
}

function parseSidebarSearchToken(token: string): SidebarSearchFilter | null {
  const idx = token.indexOf(":");
  if (idx <= 0 || idx === token.length - 1) return null;
  const key = normalizeSearchValue(token.slice(0, idx));
  const value = token.slice(idx + 1).trim();
  if (!value) return null;
  if (!isSidebarSearchKey(key)) return null;
  return { key, value };
}

function isSidebarSearchKey(key: string): key is SidebarSearchKey {
  return key === "project" || key === "status" || key === "priority" || key === "agent" || key === "has";
}

function fallbackSearchText(token: string): string {
  const idx = token.indexOf(":");
  if (idx <= 0 || idx === token.length - 1) return token;
  return token.slice(idx + 1).trim() || token;
}

function matchesSidebarSearchFilter(entry: IssueEntry, filter: SidebarSearchFilter): boolean {
  const value = normalizeSearchValue(filter.value);
  switch (filter.key) {
    case "project":
      return matchesProjectFilter(entry, value);
    case "status":
      return normalizeIssueStatus(entry.status) === normalizeIssueStatus(value);
    case "priority":
      return normalizePriority(entry.priority) === normalizePriority(value);
    case "agent":
      return matchesAgentFilter(entry, value);
    case "has":
      return matchesHasFilter(entry, value);
  }
}

function matchesProjectFilter(entry: IssueEntry, value: string): boolean {
  const slug = normalizeSearchValue(entry.project);
  const prefix = normalizeSearchValue(issuePrefix(entry.id));
  return prefix === value || slug === value || slug.includes(value);
}

function matchesAgentFilter(entry: IssueEntry, value: string): boolean {
  if (value === "none" || value === "unassigned") return !entry.agent;
  return normalizeSearchValue(entry.agent) === value;
}

function matchesHasFilter(entry: IssueEntry, value: string): boolean {
  switch (value) {
    case "pr":
      return !!entry.pr;
    case "github":
    case "gh":
    case "github-issue":
      return !!entry.githubIssue;
    case "agent":
      return !!entry.agent;
    case "commit":
    case "commits":
      return !!entry.commits?.length;
    default:
      return false;
  }
}

function issuePrefix(id: string): string {
  return id.split("-")[0] ?? "";
}

function normalizeIssueStatus(status: string | undefined): string {
  const normalized = normalizeSearchValue(status);
  if (normalized === "inprogress") return "in-progress";
  return normalized;
}

function normalizePriority(priority: string | undefined): string {
  const normalized = normalizeSearchValue(priority);
  if (normalized === "medium") return "med";
  return normalized;
}

function normalizeSearchValue(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function ghIssueNumber(url: string): number | undefined {
  const m = url.match(/\/issues\/(\d+)(?:[/?#]|$)/);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : undefined;
}

export function prNumber(url: string): number | undefined {
  const m = url.match(/\/pulls?\/(\d+)(?:[/?#]|$)/);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : undefined;
}
