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
  filterEntries,
  OpSidebarView,
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

function makeFakeEl(): any {
  const el: any = {
    children: [] as any[],
    classList: new Set<string>(),
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
    addEventListener() {},
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
