import { describe, it, expect } from "vitest";

import { buildViewScript, firstEmptyCell, pruneDeadSessionSlots } from "./orchestrator";
import type { RegistryData, WindowState } from "./layout/registry";

function makeReg(win: WindowState, surfaces: RegistryData["surfaces"] = {}): RegistryData {
  return {
    surfaces,
    windows: { [win.windowId]: win },
    windowOrder: [win.windowId],
  };
}

describe("firstEmptyCell", () => {
  it("returns the lowest undefined index within the cell count", () => {
    expect(firstEmptyCell(["a", undefined, "c"], 3)).toBe(1);
    expect(firstEmptyCell(["a", "b"], 4)).toBe(2);
  });

  it("returns -1 when every slot is occupied", () => {
    expect(firstEmptyCell(["a", "b"], 2)).toBe(-1);
  });
});

describe("pruneDeadSessionSlots", () => {
  it("clears only dead slots and keeps alive ones", async () => {
    const win: WindowState = {
      windowId: "w1",
      layoutId: "1x2",
      sessionIds: ["alive", "dead"],
      tmuxSession: "op-agents-1",
    };
    const reg = makeReg(win, {
      "OP-A": { sessionId: "alive", windowId: "w1", cellIndex: 0, layoutId: "1x2", tmuxWindow: "OP-A" },
      "OP-B": { sessionId: "dead", windowId: "w1", cellIndex: 1, layoutId: "1x2", tmuxWindow: "OP-B" },
    });

    const anyAlive = await pruneDeadSessionSlots(reg, win, async (id) => id === "alive");

    expect(anyAlive).toBe(true);
    expect(win.sessionIds).toEqual(["alive", undefined]);
    expect(reg.surfaces).toEqual({
      "OP-A": { sessionId: "alive", windowId: "w1", cellIndex: 0, layoutId: "1x2", tmuxWindow: "OP-A" },
    });
  });

  it("compacts alive sessions to the front when cell 0 is dead", async () => {
    const win: WindowState = {
      windowId: "w1",
      layoutId: "2x2",
      sessionIds: ["dead", undefined, "alive", undefined],
      tmuxSession: "op-agents-1",
    };
    const reg = makeReg(win, {
      "OP-A": { sessionId: "dead", windowId: "w1", cellIndex: 0, layoutId: "2x2", tmuxWindow: "OP-A" },
      "OP-B": { sessionId: "alive", windowId: "w1", cellIndex: 2, layoutId: "2x2", tmuxWindow: "OP-B" },
    });

    const anyAlive = await pruneDeadSessionSlots(reg, win, async (id) => id === "alive");

    expect(anyAlive).toBe(true);
    expect(win.sessionIds).toEqual(["alive", undefined, undefined, undefined]);
    expect(reg.surfaces["OP-B"].cellIndex).toBe(0);
    expect(reg.surfaces["OP-A"]).toBeUndefined();
  });

  it("reports no-alive when every slot is dead", async () => {
    const win: WindowState = {
      windowId: "w1",
      layoutId: "1x2",
      sessionIds: ["d1", "d2"],
      tmuxSession: "op-agents-1",
    };
    const reg = makeReg(win);

    const anyAlive = await pruneDeadSessionSlots(reg, win, async () => false);

    expect(anyAlive).toBe(false);
    expect(win.sessionIds).toEqual([undefined, undefined]);
  });

  it("leaves undefined slots alone", async () => {
    const win: WindowState = {
      windowId: "w1",
      layoutId: "2x2",
      sessionIds: ["alive", undefined, undefined, undefined],
      tmuxSession: "op-agents-1",
    };
    const reg = makeReg(win);

    const anyAlive = await pruneDeadSessionSlots(reg, win, async () => true);

    expect(anyAlive).toBe(true);
    expect(win.sessionIds).toEqual(["alive", undefined, undefined, undefined]);
  });
});

describe("buildViewScript", () => {
  const baseArgs = {
    tmuxBinary: "/opt/homebrew/bin/tmux",
    tmuxSession: "op-agents-1",
    tmuxWindow: "OP-172",
    issueId: "OP-172",
    issueTitle: "research - can we actually name iterm2 tmux windows",
  };

  it("emits OSC 1 (tab/icon name) with the issueId before exec", () => {
    const out = buildViewScript(baseArgs);
    expect(out).toContain(`printf '\\033]1;%s\\007' 'OP-172'`);
    const oscIdx = out.indexOf(`printf '\\033]1;`);
    const execIdx = out.indexOf("exec");
    expect(oscIdx).toBeGreaterThan(-1);
    expect(execIdx).toBeGreaterThan(oscIdx);
  });

  it("emits OSC 2 (window title) with the issueTitle when present", () => {
    const out = buildViewScript(baseArgs);
    expect(out).toContain(
      `printf '\\033]2;%s\\007' 'research - can we actually name iterm2 tmux windows'`,
    );
  });

  it("falls back to issueId for OSC 2 when issueTitle is empty", () => {
    const out = buildViewScript({ ...baseArgs, issueTitle: "" });
    expect(out).toContain(`printf '\\033]2;%s\\007' 'OP-172'`);
  });

  it("falls back to issueId for OSC 2 when issueTitle is missing", () => {
    const { issueTitle, ...rest } = baseArgs;
    const out = buildViewScript(rest);
    expect(out).toContain(`printf '\\033]2;%s\\007' 'OP-172'`);
  });

  it("does not enable tmux set-titles forwarding (OP-103 regression guard)", () => {
    const out = buildViewScript(baseArgs);
    expect(out).not.toContain("set-titles on");
    expect(out).not.toContain("set-titles-string");
  });

  it("creates the per-pane grouped session and attaches with select-window", () => {
    const out = buildViewScript(baseArgs);
    expect(out).toContain(
      `'/opt/homebrew/bin/tmux' new-session -d -s 'view-OP-172' -t 'op-agents-1' 2>/dev/null || true`,
    );
    expect(out).toContain(
      `exec '/opt/homebrew/bin/tmux' attach -t 'view-OP-172' \\; select-window -t 'view-OP-172':'OP-172'`,
    );
  });
});
