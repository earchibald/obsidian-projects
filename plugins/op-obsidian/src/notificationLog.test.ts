import { describe, it, expect, vi, beforeEach } from "vitest";

const { FakeTFile, FakeNotice } = vi.hoisted(() => {
  class FakeTFile {
    path: string;
    constructor(path: string) {
      this.path = path;
    }
  }
  const noticeCalls: Array<{ text: unknown; duration?: number }> = [];
  class FakeNotice {
    constructor(text: unknown, duration?: number) {
      noticeCalls.push({ text, duration });
    }
    hide() {}
  }
  (FakeNotice as any).calls = noticeCalls;
  return { FakeTFile, FakeNotice };
});

vi.mock("obsidian", () => ({
  TFile: FakeTFile,
  Notice: FakeNotice,
  normalizePath: (p: string) => p,
}));

// `showActionableNotice` builds a DocumentFragment, which needs a DOM. The
// log itself is what we're testing — stub the Notice path so the test only
// exercises notification-log logic.
vi.mock("./actionableNotices", () => ({
  showActionableNotice: (opts: any) => new FakeNotice(opts.text),
}));

import {
  buildLog,
  formatLine,
  NOTIFICATION_LOG_PATH,
  MAX_LOG_ENTRIES,
  appendNotification,
  notify,
  notifyAction,
  registerApp,
  unregisterApp,
  openNotificationLog,
  _resetForTests,
} from "./notificationLog";

function makeApp() {
  const files = new Map<string, { path: string; body: string }>();
  const folders = new Set<string>();
  let opened: string | undefined;
  const app = {
    vault: {
      adapter: {
        exists: async (p: string) => folders.has(p),
      },
      createFolder: async (p: string) => {
        folders.add(p);
      },
      getAbstractFileByPath: (p: string) => {
        const f = files.get(p);
        return f ? Object.assign(new FakeTFile(p), f) : null;
      },
      create: async (p: string, body: string) => {
        files.set(p, { path: p, body });
        return Object.assign(new FakeTFile(p), { body });
      },
      modify: async (file: any, body: string) => {
        const existing = files.get(file.path);
        if (existing) existing.body = body;
        else files.set(file.path, { path: file.path, body });
      },
      read: async (file: any) => files.get(file.path)?.body ?? "",
    },
    workspace: {
      getLeaf: () => ({
        openFile: async (f: any) => {
          opened = f.path;
        },
      }),
    },
  } as any;
  return { app, files, folders, getOpened: () => opened };
}

beforeEach(() => {
  _resetForTests();
  (FakeNotice as any).calls.length = 0;
});

describe("formatLine", () => {
  it("emits ISO timestamp + bullet", () => {
    const line = formatLine({
      timestamp: new Date("2026-04-25T12:30:45.000Z"),
      text: "hello",
    });
    expect(line).toBe("- 2026-04-25T12:30:45.000Z · hello");
  });

  it("includes [category] when present", () => {
    const line = formatLine({
      timestamp: new Date("2026-04-25T00:00:00.000Z"),
      text: "boom",
      category: "error",
    });
    expect(line).toBe("- 2026-04-25T00:00:00.000Z [error] · boom");
  });

  it("collapses multi-line / extra whitespace into one bullet", () => {
    const line = formatLine({
      timestamp: new Date("2026-04-25T00:00:00.000Z"),
      text: "first line\n→ hint   second\tword",
    });
    expect(line).toBe("- 2026-04-25T00:00:00.000Z · first line → hint second word");
  });

  it("strips null bytes", () => {
    const line = formatLine({
      timestamp: new Date("2026-04-25T00:00:00.000Z"),
      text: "hello\x00world",
    });
    expect(line).toBe("- 2026-04-25T00:00:00.000Z · helloworld");
  });

  it("strips ANSI CSI colour sequences from agent output", () => {
    const line = formatLine({
      timestamp: new Date("2026-04-25T00:00:00.000Z"),
      text: "\x1b[31mERROR\x1b[0m: build failed",
    });
    expect(line).toBe("- 2026-04-25T00:00:00.000Z · ERROR: build failed");
  });

  it("strips non-CSI ESC sequences (e.g. ESC M cursor-up)", () => {
    const line = formatLine({
      timestamp: new Date("2026-04-25T00:00:00.000Z"),
      text: "\x1bMsome text",
    });
    expect(line).toBe("- 2026-04-25T00:00:00.000Z · some text");
  });

  it("embedded '\\n- bullet' becomes continuation text, not a new entry", () => {
    // After sanitisation the embedded newline collapses to a space, so the
    // resulting text stays within one bullet line — no phantom entries.
    const line = formatLine({
      timestamp: new Date("2026-04-25T00:00:00.000Z"),
      text: "op: status ok\n- not a real entry\n",
    });
    expect(line).toBe(
      "- 2026-04-25T00:00:00.000Z · op: status ok - not a real entry",
    );
    // Crucially, splitting the line by "\n" yields exactly one element.
    expect(line.split("\n")).toHaveLength(1);
  });
});

describe("buildLog", () => {
  it("creates log from empty body, newest first under header", () => {
    const out = buildLog("", {
      timestamp: new Date("2026-04-25T00:00:00.000Z"),
      text: "first",
    });
    expect(out).toContain("# op notifications");
    expect(out).toContain("- 2026-04-25T00:00:00.000Z · first");
  });

  it("prepends new entry above prior entries", () => {
    const first = buildLog("", {
      timestamp: new Date("2026-04-25T00:00:00.000Z"),
      text: "older",
    });
    const second = buildLog(first, {
      timestamp: new Date("2026-04-25T00:00:01.000Z"),
      text: "newer",
    });
    const olderIdx = second.indexOf("· older");
    const newerIdx = second.indexOf("· newer");
    expect(newerIdx).toBeGreaterThan(-1);
    expect(olderIdx).toBeGreaterThan(newerIdx);
  });

  it("caps to MAX_LOG_ENTRIES bullet lines", () => {
    let body = "";
    for (let i = 0; i < MAX_LOG_ENTRIES + 50; i += 1) {
      body = buildLog(body, {
        timestamp: new Date(2_000_000_000_000 + i),
        text: `entry ${i}`,
      });
    }
    const bullets = body.split("\n").filter((l) => l.startsWith("- "));
    expect(bullets).toHaveLength(MAX_LOG_ENTRIES);
    // Newest is first; oldest 50 evicted.
    expect(bullets[0]).toContain(`entry ${MAX_LOG_ENTRIES + 49}`);
    expect(bullets[bullets.length - 1]).toContain("entry 50");
  });
});

describe("appendNotification", () => {
  it("creates the log file and parent folder when missing", async () => {
    const { app, files, folders } = makeApp();
    await appendNotification(app, "hello", {
      timestamp: new Date("2026-04-25T00:00:00.000Z"),
    });
    expect(folders.has("Projects/_scratch")).toBe(true);
    const log = files.get(NOTIFICATION_LOG_PATH);
    expect(log).toBeDefined();
    expect(log!.body).toContain("- 2026-04-25T00:00:00.000Z · hello");
  });

  it("appends successive entries newest-first", async () => {
    const { app, files } = makeApp();
    await appendNotification(app, "one", {
      timestamp: new Date("2026-04-25T00:00:00.000Z"),
    });
    await appendNotification(app, "two", {
      timestamp: new Date("2026-04-25T00:00:01.000Z"),
    });
    const body = files.get(NOTIFICATION_LOG_PATH)!.body;
    const oneIdx = body.indexOf("· one");
    const twoIdx = body.indexOf("· two");
    expect(twoIdx).toBeLessThan(oneIdx);
  });

  it("serializes concurrent appends without losing entries", async () => {
    const { app, files } = makeApp();
    const ts = new Date("2026-04-25T00:00:00.000Z");
    await Promise.all([
      appendNotification(app, "a", { timestamp: ts }),
      appendNotification(app, "b", { timestamp: ts }),
      appendNotification(app, "c", { timestamp: ts }),
    ]);
    const body = files.get(NOTIFICATION_LOG_PATH)!.body;
    const bullets = body.split("\n").filter((l) => l.startsWith("- "));
    expect(bullets).toHaveLength(3);
  });
});

describe("notify", () => {
  it("shows a Notice and logs to vault when app is registered", async () => {
    const { app, files } = makeApp();
    registerApp(app);
    notify("op-work: OP-1 → in-progress");
    // Notice fires synchronously; log write is async — flush.
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect((FakeNotice as any).calls).toHaveLength(1);
    expect((FakeNotice as any).calls[0].text).toBe("op-work: OP-1 → in-progress");
    expect(files.get(NOTIFICATION_LOG_PATH)!.body).toContain(
      "op-work: OP-1 → in-progress",
    );
  });

  it("shows a Notice without writing when no app is registered (test/early-load)", () => {
    notify("standalone");
    expect((FakeNotice as any).calls).toHaveLength(1);
  });

  it("forwards duration to Notice", () => {
    notify("hi", 12000);
    expect((FakeNotice as any).calls[0].duration).toBe(12000);
  });

  it("stops writing to vault after unregisterApp (simulates onunload)", async () => {
    const { app, files } = makeApp();
    registerApp(app);
    unregisterApp();
    notify("should not be logged");
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect((FakeNotice as any).calls).toHaveLength(1); // Notice still shows
    expect(files.get(NOTIFICATION_LOG_PATH)).toBeUndefined(); // no vault write
  });
});

describe("notifyAction", () => {
  it("logs text + action labels", async () => {
    const { app, files } = makeApp();
    registerApp(app);
    notifyAction({
      text: "op: error happened",
      actions: [{ label: "Open log", onClick: () => {} }],
    });
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    const body = files.get(NOTIFICATION_LOG_PATH)!.body;
    expect(body).toContain("op: error happened · [Open log]");
  });
});

describe("openNotificationLog", () => {
  it("opens the existing log", async () => {
    const { app, files, getOpened } = makeApp();
    files.set(NOTIFICATION_LOG_PATH, {
      path: NOTIFICATION_LOG_PATH,
      body: "x",
    });
    await openNotificationLog(app);
    expect(getOpened()).toBe(NOTIFICATION_LOG_PATH);
  });

  it("creates a placeholder when no log yet, then opens it", async () => {
    const { app, files, getOpened } = makeApp();
    await openNotificationLog(app);
    expect(getOpened()).toBe(NOTIFICATION_LOG_PATH);
    expect(files.get(NOTIFICATION_LOG_PATH)!.body).toContain(
      "No notifications recorded yet",
    );
  });

  it("handles concurrent vault.create race — falls back to existing file", async () => {
    // Simulate a vault that throws on create (file already exists from a
    // concurrent writeOnce) but then returns the file via getAbstractFileByPath.
    const { app, files, getOpened } = makeApp();
    // Pre-populate the file to simulate the concurrent write winning.
    files.set(NOTIFICATION_LOG_PATH, {
      path: NOTIFICATION_LOG_PATH,
      body: "written by concurrent writeOnce",
    });
    // Override create to throw as Obsidian would when the file already exists.
    (app.vault as any).create = async () => {
      throw new Error("File already exists");
    };
    // Should NOT throw, and should open the pre-existing file.
    await expect(openNotificationLog(app)).resolves.toBeUndefined();
    expect(getOpened()).toBe(NOTIFICATION_LOG_PATH);
  });
});
