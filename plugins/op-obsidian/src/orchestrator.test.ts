import { describe, it, expect } from "vitest";

import { firstEmptyCell, pruneDeadSessionSlots } from "./orchestrator";
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
