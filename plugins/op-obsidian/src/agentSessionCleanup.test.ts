import { describe, expect, it } from "vitest";
import {
  pruneRegistryForIssue,
  pruneRegistryMissingIssues,
  tmuxSessionsForCleanup,
} from "./agentSessionCleanup";
import { SHARED_TMUX_SESSION } from "./terminalLaunch";
import { addWindow, assignSurface, emptyRegistry, type WindowState } from "./layout/registry";

function win(id: string, tmuxSession: string, cells = 4): WindowState {
  return {
    windowId: id,
    layoutId: "2x2",
    sessionIds: new Array<string | undefined>(cells).fill(undefined),
    tmuxSession,
  };
}

describe("pruneRegistryForIssue", () => {
  it("removes the surface and frees the matching cell slot", () => {
    const r = emptyRegistry();
    addWindow(r, win("w1", "op-agents-1"));
    assignSurface(r, "OP-52", {
      sessionId: "s0",
      windowId: "w1",
      cellIndex: 2,
      layoutId: "2x2",
      tmuxWindow: "OP-52",
    });

    const { removed } = pruneRegistryForIssue(r, "OP-52");
    expect(Object.keys(removed)).toEqual(["OP-52"]);
    expect(r.surfaces["OP-52"]).toBeUndefined();
    expect(r.windows["w1"].sessionIds[2]).toBeUndefined();
  });

  it("is a no-op when the issue has no surface", () => {
    const r = emptyRegistry();
    addWindow(r, win("w1", "op-agents-1"));
    const { removed } = pruneRegistryForIssue(r, "OP-99");
    expect(removed).toEqual({});
  });

  it("does not free a cell whose sessionId has drifted", () => {
    const r = emptyRegistry();
    addWindow(r, win("w1", "op-agents-1"));
    assignSurface(r, "OP-1", {
      sessionId: "s0",
      windowId: "w1",
      cellIndex: 0,
      layoutId: "2x2",
      tmuxWindow: "OP-1",
    });
    // Simulate drift: window now has a different session in that cell.
    r.windows["w1"].sessionIds[0] = "s-other";
    pruneRegistryForIssue(r, "OP-1");
    expect(r.windows["w1"].sessionIds[0]).toBe("s-other");
  });
});

describe("pruneRegistryMissingIssues", () => {
  it("removes surfaces whose issueId is not in the alive set", () => {
    const r = emptyRegistry();
    addWindow(r, win("w1", "op-agents-1"));
    assignSurface(r, "OP-1", {
      sessionId: "s0",
      windowId: "w1",
      cellIndex: 0,
      layoutId: "2x2",
      tmuxWindow: "OP-1",
    });
    assignSurface(r, "OP-2", {
      sessionId: "s1",
      windowId: "w1",
      cellIndex: 1,
      layoutId: "2x2",
      tmuxWindow: "OP-2",
    });
    const { removed } = pruneRegistryMissingIssues(r, new Set(["OP-1"]));
    expect(Object.keys(removed)).toEqual(["OP-2"]);
    expect(r.surfaces["OP-1"]).toBeDefined();
    expect(r.surfaces["OP-2"]).toBeUndefined();
  });
});

describe("tmuxSessionsForCleanup", () => {
  it("always includes the legacy shared session", () => {
    const r = emptyRegistry();
    expect(tmuxSessionsForCleanup(r)).toContain(SHARED_TMUX_SESSION);
  });

  it("collects per-window tmux sessions from the registry", () => {
    const r = emptyRegistry();
    addWindow(r, win("w1", "op-agents-1"));
    addWindow(r, win("w2", "op-agents-2"));
    const sessions = tmuxSessionsForCleanup(r);
    expect(sessions).toContain("op-agents-1");
    expect(sessions).toContain("op-agents-2");
    expect(sessions).toContain(SHARED_TMUX_SESSION);
  });
});
