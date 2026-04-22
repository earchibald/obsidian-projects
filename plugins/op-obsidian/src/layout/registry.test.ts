import { describe, expect, it } from "vitest";
import {
  activeWindow,
  addWindow,
  assignSurface,
  emptyRegistry,
  firstFreeCell,
  mergeRegistry,
  type WindowState,
} from "./registry";

function win(id: string, cells = 4): WindowState {
  return {
    windowId: id,
    layoutId: "2x2",
    sessionIds: new Array<string | undefined>(cells).fill(undefined),
    tmuxSession: `op-agents-${id}`,
  };
}

describe("registry", () => {
  it("emptyRegistry is empty", () => {
    const r = emptyRegistry();
    expect(r.surfaces).toEqual({});
    expect(r.windows).toEqual({});
    expect(r.windowOrder).toEqual([]);
  });

  it("addWindow appends to order without duplicates", () => {
    const r = emptyRegistry();
    addWindow(r, win("w1"));
    addWindow(r, win("w2"));
    addWindow(r, win("w1")); // duplicate
    expect(r.windowOrder).toEqual(["w1", "w2"]);
  });

  it("activeWindow returns the most recent window", () => {
    const r = emptyRegistry();
    expect(activeWindow(r)).toBeUndefined();
    addWindow(r, win("w1"));
    addWindow(r, win("w2"));
    expect(activeWindow(r)?.windowId).toBe("w2");
  });

  it("assignSurface updates both surfaces and window state", () => {
    const r = emptyRegistry();
    addWindow(r, win("w1"));
    assignSurface(r, "OP-1", {
      sessionId: "s0",
      windowId: "w1",
      cellIndex: 0,
      layoutId: "2x2",
      tmuxWindow: "OP-1",
    });
    expect(r.surfaces["OP-1"].sessionId).toBe("s0");
    expect(r.windows["w1"].sessionIds[0]).toBe("s0");
  });

  it("firstFreeCell finds the first undefined slot", () => {
    const w = win("w1", 4);
    w.sessionIds[0] = "a";
    w.sessionIds[1] = "b";
    expect(firstFreeCell(w, 4)).toBe(2);
    w.sessionIds[2] = "c";
    w.sessionIds[3] = "d";
    expect(firstFreeCell(w, 4)).toBeUndefined();
  });

  it("mergeRegistry tolerates unknown input", () => {
    expect(mergeRegistry(null)).toEqual(emptyRegistry());
    expect(mergeRegistry(undefined)).toEqual(emptyRegistry());
    expect(mergeRegistry({})).toEqual(emptyRegistry());
    expect(mergeRegistry({ windowOrder: ["w1", 5, null] }).windowOrder).toEqual(["w1"]);
  });

  it("mergeRegistry round-trips valid data", () => {
    const r = emptyRegistry();
    addWindow(r, win("w1"));
    assignSurface(r, "OP-1", {
      sessionId: "s0",
      windowId: "w1",
      cellIndex: 0,
      layoutId: "2x2",
      tmuxWindow: "OP-1",
    });
    const roundTrip = mergeRegistry(JSON.parse(JSON.stringify(r)));
    expect(roundTrip.surfaces["OP-1"].sessionId).toBe("s0");
    expect(roundTrip.windowOrder).toEqual(["w1"]);
  });
});
