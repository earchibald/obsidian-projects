import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import type { IssueEntry } from "./types";

// `requestAnimationFrame` is a browser/Electron global absent in Node.js / Vitest.
// Without it, `scheduleRender()` throws inside `tickTmuxProbe`'s try block, which
// incorrectly triggers the catch path (marking liveTmuxWindows null) and adds
// spurious console.debug noise. Stub it globally so the success path is exercised.
beforeAll(() => {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    setTimeout(() => cb(0), 0);
    return 0;
  });
});

vi.mock("obsidian", () => ({
  App: class {},
  ItemView: class {
    contentEl: any = makeFakeEl();
  },
  Menu: class {
    addItem() {
      return this;
    }
    showAtMouseEvent() {}
  },
  Modal: class {},
  TFile: class {},
  WorkspaceLeaf: class {},
  setIcon: () => {},
  setTooltip: () => {},
  prepareFuzzySearch: () => () => null,
}));

vi.mock("./staleAgentBadges", () => ({
  probeLiveTmuxWindows: vi.fn(async () => ({ live: new Set<string>(), ok: true })),
}));

import {
  buildSidebarMenuItems,
  decideKeyAction,
  filterEntries,
  OpResolveConfirmModal,
  OpSidebarView,
  prNumber,
  shouldShowProjectChip,
  TMUX_PROBE_INTERVAL_MS,
  type OpSidebarHooks,
} from "./sidebarView";
import { probeLiveTmuxWindows } from "./staleAgentBadges";

function entry(over: Partial<IssueEntry>): IssueEntry {
  return {
    path: "x.md",
    type: "issue",
    id: "OP-1",
    project: "obsidian-projects",
    status: "open",
    title: "OP-1 placeholder",
    resolvedFolder: false,
    ...over,
  };
}

const subseqMatcher = (q: string) => (text: string) => {
  const lq = q.toLowerCase();
  const lt = text.toLowerCase();
  let i = 0;
  for (const ch of lt) {
    if (ch === lq[i]) i++;
    if (i === lq.length) return { score: -1, matches: [] };
  }
  return null;
};

describe("filterEntries", () => {
  const items = [
    entry({ id: "OP-1", title: "OP-1 sidebar fuzzy filter" }),
    entry({ id: "OP-2", title: "OP-2 settings tab cleanup" }),
    entry({ id: "JB-9", title: "JB-9 link escaping", project: "jira-bases" }),
  ];

  it("returns all entries when query is empty", () => {
    expect(filterEntries(items, "", subseqMatcher)).toHaveLength(3);
    expect(filterEntries(items, "   ", subseqMatcher)).toHaveLength(3);
  });

  it("filters to fuzzy-matching entries by title", () => {
    const out = filterEntries(items, "filter", subseqMatcher);
    expect(out.map((e) => e.id)).toEqual(["OP-1"]);
  });

  it("matches against id", () => {
    const out = filterEntries(items, "jb9", subseqMatcher);
    expect(out.map((e) => e.id)).toEqual(["JB-9"]);
  });

  it("matches against project slug", () => {
    const out = filterEntries(items, "jira", subseqMatcher);
    expect(out.map((e) => e.id)).toEqual(["JB-9"]);
  });

  it("returns empty when nothing matches", () => {
    expect(filterEntries(items, "zzznotpresent", subseqMatcher)).toEqual([]);
  });

  it("preserves input order", () => {
    const out = filterEntries(items, "op", subseqMatcher);
    expect(out.map((e) => e.id)).toEqual(["OP-1", "OP-2"]);
  });
});

describe("prNumber", () => {
  it("parses /pull/N", () => {
    expect(prNumber("https://github.com/owner/repo/pull/42")).toBe(42);
  });
  it("parses /pulls/N (gh's older form)", () => {
    expect(prNumber("https://github.com/owner/repo/pulls/7")).toBe(7);
  });
  it("ignores trailing path segments", () => {
    expect(prNumber("https://github.com/owner/repo/pull/12/files")).toBe(12);
    expect(prNumber("https://github.com/owner/repo/pull/12#issuecomment-1")).toBe(12);
    expect(prNumber("https://github.com/owner/repo/pull/12?diff=split")).toBe(12);
  });
  it("returns undefined for issue URLs", () => {
    expect(prNumber("https://github.com/owner/repo/issues/12")).toBeUndefined();
  });
  it("returns undefined when no number is present", () => {
    expect(prNumber("https://github.com/owner/repo/pull/")).toBeUndefined();
    expect(prNumber("https://example.com")).toBeUndefined();
  });
});

describe("shouldShowProjectChip", () => {
  const op1 = entry({ id: "OP-1", project: "obsidian-projects" });
  const op2 = entry({ id: "OP-2", project: "obsidian-projects" });
  const jb1 = entry({ id: "JB-1", project: "jira-bases" });

  it("always shows the chip in comfortable density, even single-project", () => {
    expect(shouldShowProjectChip("comfortable", [])).toBe(true);
    expect(shouldShowProjectChip("comfortable", [op1])).toBe(true);
    expect(shouldShowProjectChip("comfortable", [op1, op2])).toBe(true);
    expect(shouldShowProjectChip("comfortable", [op1, jb1])).toBe(true);
  });

  it("hides the chip in compact density when every entry shares one project", () => {
    expect(shouldShowProjectChip("compact", [op1])).toBe(false);
    expect(shouldShowProjectChip("compact", [op1, op2])).toBe(false);
  });

  it("keeps the chip in compact density when projects differ", () => {
    expect(shouldShowProjectChip("compact", [op1, jb1])).toBe(true);
    expect(shouldShowProjectChip("compact", [jb1, op1, op2])).toBe(true);
  });

  it("treats an empty list as 'show' so the empty-state placeholder isn't rare-cased", () => {
    expect(shouldShowProjectChip("compact", [])).toBe(true);
  });
});

describe("decideKeyAction", () => {
  const k = (
    key: string,
    mods: Partial<{ alt: boolean; shift: boolean; meta: boolean; ctrl: boolean }> = {},
  ) => ({
    key,
    altKey: !!mods.alt,
    shiftKey: !!mods.shift,
    metaKey: !!mods.meta,
    ctrlKey: !!mods.ctrl,
  });

  it("plain ArrowDown / ArrowUp / Enter map to next / prev / open in both contexts", () => {
    for (const inFilter of [false, true]) {
      expect(decideKeyAction(k("ArrowDown"), { inFilter })).toBe("next");
      expect(decideKeyAction(k("ArrowUp"), { inFilter })).toBe("prev");
      expect(decideKeyAction(k("Enter"), { inFilter })).toBe("open");
    }
  });

  it("Cmd+Enter and Ctrl+Enter both map to launch in both contexts", () => {
    for (const inFilter of [false, true]) {
      expect(decideKeyAction(k("Enter", { meta: true }), { inFilter })).toBe("launch");
      expect(decideKeyAction(k("Enter", { ctrl: true }), { inFilter })).toBe("launch");
    }
  });

  it("plain j / k / r map to next / prev / resolve when the filter input is unfocused", () => {
    expect(decideKeyAction(k("j"), { inFilter: false })).toBe("next");
    expect(decideKeyAction(k("k"), { inFilter: false })).toBe("prev");
    expect(decideKeyAction(k("r"), { inFilter: false })).toBe("resolve");
  });

  it("ignores letter shortcuts when the filter input is focused so users can type", () => {
    expect(decideKeyAction(k("j"), { inFilter: true })).toBe("ignore");
    expect(decideKeyAction(k("k"), { inFilter: true })).toBe("ignore");
    expect(decideKeyAction(k("r"), { inFilter: true })).toBe("ignore");
  });

  it("ignores modifier-laden letter keys to avoid hijacking Cmd-J / Shift-K / etc.", () => {
    expect(decideKeyAction(k("j", { meta: true }), { inFilter: false })).toBe("ignore");
    expect(decideKeyAction(k("j", { shift: true }), { inFilter: false })).toBe("ignore");
    expect(decideKeyAction(k("k", { ctrl: true }), { inFilter: false })).toBe("ignore");
    expect(decideKeyAction(k("r", { alt: true }), { inFilter: false })).toBe("ignore");
  });

  it("ignores unrelated keys (letters, function keys, punctuation)", () => {
    expect(decideKeyAction(k("a"), { inFilter: false })).toBe("ignore");
    expect(decideKeyAction(k("Escape"), { inFilter: false })).toBe("ignore");
    expect(decideKeyAction(k("F1"), { inFilter: false })).toBe("ignore");
    expect(decideKeyAction(k("/"), { inFilter: false })).toBe("ignore");
  });

  it("ignores Shift+Enter and Alt+Enter (only plain or Cmd/Ctrl+Enter trigger an action)", () => {
    expect(decideKeyAction(k("Enter", { shift: true }), { inFilter: false })).toBe("ignore");
    expect(decideKeyAction(k("Enter", { alt: true }), { inFilter: false })).toBe("ignore");
    expect(decideKeyAction(k("Enter", { meta: true, alt: true }), { inFilter: false })).toBe(
      "ignore",
    );
  });
});

function makeFakeEl(): any {
  const _listeners: Record<string, Array<(ev: any) => void>> = {};
  const el: any = {
    children: [] as any[],
    classList: new Set<string>(),
    /** Captured handlers, keyed by event name.  Used by wiring tests. */
    _listeners,
    addClass(c: string) {
      this.classList.add(c);
    },
    toggleClass(c: string, on: boolean) {
      if (on) this.classList.add(c);
      else this.classList.delete(c);
    },
    empty() {
      this.children.length = 0;
    },
    createDiv(_o: any) {
      const child = makeFakeEl();
      this.children.push(child);
      return child;
    },
    createEl(_tag: string, _o?: any) {
      const child = makeFakeEl();
      this.children.push(child);
      return child;
    },
    createSpan(_o: any) {
      const child = makeFakeEl();
      this.children.push(child);
      return child;
    },
    setAttr() {},
    addEventListener(event: string, handler: (ev: any) => void) {
      (_listeners[event] ??= []).push(handler);
    },
    removeEventListener() {},
    removeClass() {},
    focus() {},
    scrollIntoView() {},
  };
  return el;
}

class FakeStore {
  byId() {
    return undefined;
  }
  issues() {
    return [] as IssueEntry[];
  }
}

class FakeBus {
  on() {
    return () => {};
  }
  emit() {}
}

function makeView(hooks?: OpSidebarHooks): any {
  const store = new FakeStore();
  const bus = new FakeBus();
  const view = new OpSidebarView(
    {} as any,
    store as any,
    bus as any,
    () =>
      ({
        defaultTab: "issues",
        recentResolvedLimit: 20,
        openOnStartup: false,
        density: "comfortable",
      } as any),
    undefined,
    undefined,
    hooks,
  );
  return view;
}

function withDarwin<T>(run: () => T): T {
  const desc = Object.getOwnPropertyDescriptor(process, "platform");
  Object.defineProperty(process, "platform", { value: "darwin", configurable: true });
  try {
    return run();
  } finally {
    if (desc) Object.defineProperty(process, "platform", desc);
  }
}

describe("OpSidebarView visibility-gated tmux probe", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(probeLiveTmuxWindows).mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts the probe on onOpen and stops it on onClose (single-cycle)", async () => {
    await withDarwin(async () => {
      const view = makeView({
        getRecent: () => [],
        tmuxBinary: () => "/opt/homebrew/bin/tmux",
        tmuxSessions: () => ["op-agents"],
        recordRecency: async () => {},
        executeResumeLast: () => {},
      });
      await view.onOpen();
      expect(view.isProbeRunning()).toBe(true);

      // The kickoff call fires immediately + we advance once to fire one
      // interval tick. Verifies the timer is wired.
      await Promise.resolve();
      await Promise.resolve();
      expect(probeLiveTmuxWindows).toHaveBeenCalled();
      const first = (probeLiveTmuxWindows as any).mock.calls.length;

      vi.advanceTimersByTime(TMUX_PROBE_INTERVAL_MS);
      expect((probeLiveTmuxWindows as any).mock.calls.length).toBeGreaterThan(first);

      await view.onClose();
      expect(view.isProbeRunning()).toBe(false);

      const afterClose = (probeLiveTmuxWindows as any).mock.calls.length;
      vi.advanceTimersByTime(TMUX_PROBE_INTERVAL_MS * 2);
      expect((probeLiveTmuxWindows as any).mock.calls.length).toBe(afterClose);
    });
  });

  it("does not double-start when onOpen runs twice", async () => {
    await withDarwin(async () => {
      const view = makeView({
        getRecent: () => [],
        tmuxBinary: () => "/opt/homebrew/bin/tmux",
        tmuxSessions: () => ["op-agents"],
        recordRecency: async () => {},
        executeResumeLast: () => {},
      });
      await view.onOpen();
      const firstTimer = (view as any).probeTimer;
      await view.onOpen();
      const secondTimer = (view as any).probeTimer;
      expect(secondTimer).toBe(firstTimer);
      await view.onClose();
    });
  });

  it("does not start the probe on non-darwin", async () => {
    const desc = Object.getOwnPropertyDescriptor(process, "platform");
    Object.defineProperty(process, "platform", { value: "linux", configurable: true });
    try {
      const view = makeView({
        getRecent: () => [],
        tmuxBinary: () => "tmux",
        tmuxSessions: () => ["op-agents"],
        recordRecency: async () => {},
        executeResumeLast: () => {},
      });
      await view.onOpen();
      expect(view.isProbeRunning()).toBe(false);
      expect(probeLiveTmuxWindows).not.toHaveBeenCalled();
      await view.onClose();
    } finally {
      if (desc) Object.defineProperty(process, "platform", desc);
    }
  });

  it("does not start the probe when no hooks are wired (legacy callers)", async () => {
    await withDarwin(async () => {
      const view = makeView(undefined);
      await view.onOpen();
      expect(view.isProbeRunning()).toBe(false);
      await view.onClose();
    });
  });
});

// ─── OpResolveConfirmModal ────────────────────────────────────────────────────

describe("OpResolveConfirmModal", () => {
  it("calls onDismiss when closed (Cancel / Resolve / Esc all hit onClose)", () => {
    const onConfirm = vi.fn();
    const onDismiss = vi.fn();
    const modal = new OpResolveConfirmModal(
      {} as any,
      entry({ id: "OP-42", title: "OP-42 example" }),
      onConfirm,
      onDismiss,
    );
    (modal as any).contentEl = makeFakeEl();
    modal.onClose();
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("does not throw when onDismiss is omitted", () => {
    const modal = new OpResolveConfirmModal(
      {} as any,
      entry({ id: "OP-1", title: "OP-1 placeholder" }),
      vi.fn(),
    );
    (modal as any).contentEl = makeFakeEl();
    expect(() => modal.onClose()).not.toThrow();
  });
});

// ─── buildSidebarMenuItems ───────────────────────────────────────────────────

describe("buildSidebarMenuItems", () => {
  const baseHooks: OpSidebarHooks = {
    getRecent: () => [],
    tmuxBinary: () => "tmux",
    tmuxSessions: () => [],
    recordRecency: async () => {},
    executeResumeLast: () => {},
  };

  function keys(items: ReturnType<typeof buildSidebarMenuItems>): string[] {
    return items.map((i) => i.key);
  }

  it("offers Resolve + Resolve as wontfix on an open issue", () => {
    const items = buildSidebarMenuItems(entry({ status: "open" }), {
      ...baseHooks,
      resolveIssue: vi.fn(),
    });
    expect(keys(items)).toEqual(["resolve", "resolve-wontfix"]);
  });

  it("forwards the right status to resolveIssue for each item", () => {
    const resolveIssue = vi.fn();
    const e = entry({ status: "open" });
    const items = buildSidebarMenuItems(e, { ...baseHooks, resolveIssue });
    items.find((i) => i.key === "resolve")!.run();
    items.find((i) => i.key === "resolve-wontfix")!.run();
    expect(resolveIssue).toHaveBeenNthCalledWith(1, e, "resolved");
    expect(resolveIssue).toHaveBeenNthCalledWith(2, e, "wontfix");
  });

  it("omits Resolve / Resolve-wontfix on a resolved issue (any of status, wontfix, resolvedFolder)", () => {
    for (const e of [
      entry({ status: "resolved" }),
      entry({ status: "wontfix" }),
      entry({ status: "open", resolvedFolder: true }),
    ]) {
      const items = buildSidebarMenuItems(e, { ...baseHooks, resolveIssue: vi.fn() });
      expect(keys(items)).not.toContain("resolve");
      expect(keys(items)).not.toContain("resolve-wontfix");
    }
  });

  it("treats resolvedFolder:true as resolved even when status is 'in-progress' or 'blocked' (stale-frontmatter scenario)", () => {
    // A file can end up in RESOLVED ISSUES/ while the frontmatter still has a
    // work-in-progress status — e.g. the file was dragged back in Finder but
    // the op watcher hasn't rewritten the note yet.  resolvedFolder is the
    // ground truth; Resolve items must be suppressed to prevent a double-move.
    for (const status of ["in-progress", "blocked"] as const) {
      const stale = entry({ status, resolvedFolder: true });
      const items = buildSidebarMenuItems(stale, { ...baseHooks, resolveIssue: vi.fn() });
      expect(keys(items)).not.toContain("resolve");
      expect(keys(items)).not.toContain("resolve-wontfix");
    }
  });

  it("offers Reopen only when the row is resolved AND the hook is wired", () => {
    const open = entry({ status: "open" });
    const resolved = entry({ status: "resolved" });
    const wontfix = entry({ status: "wontfix" });

    // Hook absent → never offered.
    expect(keys(buildSidebarMenuItems(resolved, baseHooks))).not.toContain("reopen");

    const hooks = { ...baseHooks, reopenIssue: vi.fn() };
    expect(keys(buildSidebarMenuItems(open, hooks))).not.toContain("reopen");
    expect(keys(buildSidebarMenuItems(resolved, hooks))).toContain("reopen");
    expect(keys(buildSidebarMenuItems(wontfix, hooks))).toContain("reopen");
  });

  it("offers Detach agent only when entry.agent is set AND the hook is wired", () => {
    const noAgent = entry({ agent: undefined });
    const withAgent = entry({ agent: "claude" });

    // Hook absent → never offered, even if agent is set.
    expect(keys(buildSidebarMenuItems(withAgent, baseHooks))).not.toContain("detach-agent");

    const hooks = { ...baseHooks, detachAgent: vi.fn() };
    expect(keys(buildSidebarMenuItems(noAgent, hooks))).not.toContain("detach-agent");
    expect(keys(buildSidebarMenuItems(withAgent, hooks))).toContain("detach-agent");
  });

  it("offers Open GitHub issue only when githubIssue is set AND the hook is wired", () => {
    const noGh = entry({ githubIssue: undefined });
    const withGh = entry({ githubIssue: "https://github.com/x/y/issues/3" });

    // Hook absent → never offered, even if URL is set.
    expect(keys(buildSidebarMenuItems(withGh, baseHooks))).not.toContain("open-github-issue");

    const hooks = { ...baseHooks, openGithubIssue: vi.fn() };
    expect(keys(buildSidebarMenuItems(noGh, hooks))).not.toContain("open-github-issue");
    expect(keys(buildSidebarMenuItems(withGh, hooks))).toContain("open-github-issue");
  });

  it("returns the menu items in a stable order: resolve → wontfix → reopen → detach → github", () => {
    // Open with agent and GH — the resolve pair appears, then detach, then github.
    const open = entry({ status: "open", agent: "claude", githubIssue: "https://github.com/x/y/issues/3" });
    const openHooks: OpSidebarHooks = {
      ...baseHooks,
      resolveIssue: vi.fn(),
      detachAgent: vi.fn(),
      openGithubIssue: vi.fn(),
    };
    expect(keys(buildSidebarMenuItems(open, openHooks))).toEqual([
      "resolve",
      "resolve-wontfix",
      "detach-agent",
      "open-github-issue",
    ]);

    // Resolved with everything wired — reopen sits between the (omitted)
    // resolve pair and detach/github.
    const resolved = entry({
      status: "resolved",
      agent: "claude",
      githubIssue: "https://github.com/x/y/issues/3",
    });
    const allHooks: OpSidebarHooks = { ...openHooks, reopenIssue: vi.fn() };
    expect(keys(buildSidebarMenuItems(resolved, allHooks))).toEqual([
      "reopen",
      "detach-agent",
      "open-github-issue",
    ]);
  });

  it("returns an empty list when no items apply (resolved row, no hooks wired)", () => {
    expect(buildSidebarMenuItems(entry({ status: "resolved" }), baseHooks)).toEqual([]);
  });

  it("calls openGithubIssue with the entry when the menu item runs", () => {
    const openGithubIssue = vi.fn();
    const e = entry({ githubIssue: "https://github.com/x/y/issues/9" });
    const items = buildSidebarMenuItems(e, { ...baseHooks, openGithubIssue });
    items.find((i) => i.key === "open-github-issue")!.run();
    expect(openGithubIssue).toHaveBeenCalledWith(e);
  });
});

// ─── render() selection identity preservation ────────────────────────────────

describe("render() selection identity", () => {
  function makeViewWithIssues(issues: IssueEntry[]): any {
    const bus = new FakeBus();
    const store = {
      byId: () => undefined,
      issues: () => issues,
    };
    return new OpSidebarView(
      {} as any,
      store as any,
      bus as any,
      () =>
        ({
          defaultTab: "issues",
          recentResolvedLimit: 20,
          openOnStartup: false,
          density: "comfortable",
        } as any),
      undefined,
      undefined,
      undefined,
    );
  }

  it("preserves the selected row by id when a new issue inserts before it", async () => {
    const op100 = entry({ id: "OP-100", title: "OP-100 original" });
    const issues: IssueEntry[] = [op100];
    const view = makeViewWithIssues(issues);
    await view.onOpen();
    expect((view as any).selectedIndex).toBe(0);
    expect((view as any).displayedIssues[0].id).toBe("OP-100");

    // OP-001 sorts before OP-100 numerically — the selection must stay on OP-100.
    issues.unshift(entry({ id: "OP-001", title: "OP-001 new" }));
    (view as any).render();
    expect((view as any).selectedIndex).toBe(1);
    expect((view as any).displayedIssues[(view as any).selectedIndex].id).toBe("OP-100");

    await view.onClose();
  });

  it("falls back to index 0 when the previously selected issue leaves the list", async () => {
    const op1 = entry({ id: "OP-1" });
    const op2 = entry({ id: "OP-2" });
    const issues: IssueEntry[] = [op1, op2];
    const view = makeViewWithIssues(issues);
    await view.onOpen();
    (view as any).selectedIndex = 1;

    issues.splice(1, 1); // OP-2 leaves the rendered list
    (view as any).render();
    expect((view as any).selectedIndex).toBe(0);
    expect((view as any).displayedIssues[0].id).toBe("OP-1");

    await view.onClose();
  });
});

// ─── render() contextmenu wiring ────────────────────────────────────────────

describe("render() contextmenu wiring", () => {
  it("attaches a contextmenu listener that calls preventDefault/stopPropagation and selects the row", async () => {
    const resolveIssue = vi.fn();
    const e1 = entry({ id: "OP-1", status: "open" });
    const e2 = entry({ id: "OP-2", status: "open" });
    const issues = [e1, e2];

    const store = { byId: () => undefined, issues: () => issues };
    const bus = new FakeBus();
    const view = new OpSidebarView(
      {} as any,
      store as any,
      bus as any,
      () =>
        ({
          defaultTab: "issues",
          recentResolvedLimit: 20,
          openOnStartup: false,
          density: "comfortable",
        } as any),
      undefined,
      undefined,
      {
        getRecent: () => [],
        tmuxBinary: () => "tmux",
        tmuxSessions: () => [],
        recordRecency: async () => {},
        executeResumeLast: () => {},
        resolveIssue,
      },
    );

    await view.onOpen();

    const rows: any[] = (view as any).rowEls;
    expect(rows).toHaveLength(2);

    // Every rendered row must have exactly one contextmenu handler wired.
    expect(rows[0]._listeners["contextmenu"]).toHaveLength(1);
    expect(rows[1]._listeners["contextmenu"]).toHaveLength(1);

    // Fire contextmenu on the second row (index 1).
    const fakeEv = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
    rows[1]._listeners["contextmenu"][0](fakeEv);

    expect(fakeEv.preventDefault).toHaveBeenCalled();
    expect(fakeEv.stopPropagation).toHaveBeenCalled();
    // Selection must have moved to the second row.
    expect((view as any).selectedIndex).toBe(1);

    await view.onClose();
  });
});
