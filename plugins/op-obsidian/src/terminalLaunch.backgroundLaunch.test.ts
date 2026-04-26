// OP-155 §4 Step 1 — integration-level tests for launchInTerminal's
// background-launch wiring: that `backgroundLaunch:true` triggers
// `open -ga iTerm` and passes `activate:false` through to the WS driver.
//
// All I/O is mocked so the tests run without tmux / iTerm / a real FS:
// • child_process.execFile  — captures all process invocations
// • ./iterm/driver          — stubs the WS create/tab calls
// • fs.promises             — stubs mkdtemp + writeFile
//
// The function also guards `process.platform === "darwin"`; we stub that
// for the test run so the CI Linux environment doesn't short-circuit.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// ── platform stub ──────────────────────────────────────────────────────────
const originalPlatform = process.platform;
beforeAll(() => {
  Object.defineProperty(process, "platform", { value: "darwin", configurable: true });
});
afterAll(() => {
  Object.defineProperty(process, "platform", { value: originalPlatform, configurable: true });
});

// ── child_process mock ─────────────────────────────────────────────────────
// Capture (file, args) for every execFile call; always succeed with empty
// stdout. Empty stdout from `tmux list-clients` → isSessionAttached returns
// false → the open/createTab path runs as expected.
const execFileMock = vi.fn();
vi.mock("child_process", () => ({
  execFile: (
    file: string,
    args: string[],
    cb: (err: null, result: { stdout: string; stderr: string }) => void,
  ) => {
    execFileMock(file, args);
    cb(null, { stdout: "", stderr: "" });
  },
}));

// ── iterm driver mock ──────────────────────────────────────────────────────
vi.mock("./iterm/driver", () => ({
  activeWindowId: vi.fn(async () => "w-active"),
  createTab: vi.fn(async () => ({ windowId: "w-active", sessionId: "s-new" })),
  createWindow: vi.fn(async () => ({ windowId: "w-new", sessionId: "s-new" })),
}));

// ── fs mock ────────────────────────────────────────────────────────────────
vi.mock("fs", () => ({
  promises: {
    mkdtemp: vi.fn(async () => "/tmp/op-agent-test"),
    writeFile: vi.fn(async () => undefined),
  },
}));

import * as driver from "./iterm/driver";
import { launchInTerminal } from "./terminalLaunch";

const BASE = {
  cwd: "/tmp",
  binary: "/usr/bin/env",
  launchFlags: [] as string[],
  prompt: "do stuff",
  terminalApp: "iTerm" as const,
  iTermPlacement: "new-tab" as const,
  tmuxBinary: "/opt/homebrew/bin/tmux",
  agentId: "agt-1",
  issueId: "OP-1",
};

describe("launchInTerminal backgroundLaunch wiring (OP-155 §4 Step 1)", () => {
  beforeEach(() => {
    execFileMock.mockClear();
    vi.mocked(driver.activeWindowId).mockResolvedValue("w-active");
    vi.mocked(driver.createTab).mockResolvedValue({ windowId: "w-active", sessionId: "s-new" });
    vi.mocked(driver.createWindow).mockResolvedValue({ windowId: "w-new", sessionId: "s-new" });
  });

  it("calls /usr/bin/open -ga iTerm when backgroundLaunch:true", async () => {
    await launchInTerminal({ ...BASE, backgroundLaunch: true });
    expect(execFileMock).toHaveBeenCalledWith("/usr/bin/open", ["-ga", "iTerm"]);
  });

  it("does not call open -ga when backgroundLaunch is false", async () => {
    await launchInTerminal({ ...BASE, backgroundLaunch: false });
    const bgCalls = execFileMock.mock.calls.filter(
      ([f, a]: [string, string[]]) => f === "/usr/bin/open" && a.includes("-ga"),
    );
    expect(bgCalls).toHaveLength(0);
  });

  it("does not call open -ga when backgroundLaunch is absent (default)", async () => {
    await launchInTerminal({ ...BASE });
    const bgCalls = execFileMock.mock.calls.filter(
      ([f, a]: [string, string[]]) => f === "/usr/bin/open" && a.includes("-ga"),
    );
    expect(bgCalls).toHaveLength(0);
  });

  it("passes activate:false to createTab (new-tab, active window) when backgroundLaunch:true", async () => {
    vi.mocked(driver.activeWindowId).mockResolvedValue("w-active");
    await launchInTerminal({ ...BASE, backgroundLaunch: true });
    expect(driver.createTab).toHaveBeenCalledWith(
      expect.any(String),
      "w-active",
      { activate: false },
    );
  });

  it("passes activate:false to createWindow (new-tab, no active window) when backgroundLaunch:true", async () => {
    vi.mocked(driver.activeWindowId).mockResolvedValue(undefined);
    await launchInTerminal({ ...BASE, backgroundLaunch: true });
    expect(driver.createWindow).toHaveBeenCalledWith(expect.any(String), { activate: false });
  });

  it("passes activate:false to createWindow (new-window placement) when backgroundLaunch:true", async () => {
    await launchInTerminal({ ...BASE, iTermPlacement: "new-window", backgroundLaunch: true });
    expect(driver.createWindow).toHaveBeenCalledWith(expect.any(String), { activate: false });
  });

  it("passes activate:true to createTab when backgroundLaunch is false (default behavior preserved)", async () => {
    vi.mocked(driver.activeWindowId).mockResolvedValue("w-active");
    await launchInTerminal({ ...BASE, backgroundLaunch: false });
    expect(driver.createTab).toHaveBeenCalledWith(
      expect.any(String),
      "w-active",
      { activate: true },
    );
  });
});

