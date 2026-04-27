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

// OP-234: AgentMetadata is the launch-time payload the OP-230 dashboard
// daemon reads from data.json on first connect. Round-tripping has to keep
// pre-OP-217 surfaces (no `agent` block) valid — schema-drift guard.
describe("registry — AgentMetadata (OP-234)", () => {
  it("round-trips an agent block with all fields populated", () => {
    const r = emptyRegistry();
    addWindow(r, win("w1"));
    assignSurface(r, "OP-1", {
      sessionId: "s0",
      windowId: "w1",
      cellIndex: 0,
      layoutId: "2x2",
      tmuxWindow: "OP-1",
      agent: {
        model: "claude-sonnet-4-6",
        contextWindowSize: 200_000,
        startTime: 1735000000000,
        workdir: "/Users/me/Projects/op",
      },
    });
    const out = mergeRegistry(JSON.parse(JSON.stringify(r)));
    expect(out.surfaces["OP-1"].agent).toEqual({
      model: "claude-sonnet-4-6",
      contextWindowSize: 200_000,
      startTime: 1735000000000,
      workdir: "/Users/me/Projects/op",
    });
  });

  it("round-trips a minimal agent block (only startTime)", () => {
    const r = emptyRegistry();
    addWindow(r, win("w1"));
    assignSurface(r, "OP-2", {
      sessionId: "s1",
      windowId: "w1",
      cellIndex: 0,
      layoutId: "2x2",
      tmuxWindow: "OP-2",
      agent: { startTime: 1735000000000 },
    });
    const out = mergeRegistry(JSON.parse(JSON.stringify(r)));
    expect(out.surfaces["OP-2"].agent).toEqual({ startTime: 1735000000000 });
  });

  it("preserves pre-OP-217 surfaces with no agent block (schema-drift guard)", () => {
    // Simulate a data.json snapshot written before OP-234 shipped — surfaces
    // have no `agent` field at all. mergeRegistry must keep the row, not
    // synthesize an empty AgentMetadata.
    const legacy = {
      surfaces: {
        "OP-99": {
          sessionId: "s9",
          windowId: "w1",
          cellIndex: 0,
          layoutId: "2x2",
          tmuxWindow: "OP-99",
        },
      },
      windows: {
        w1: {
          windowId: "w1",
          layoutId: "2x2",
          sessionIds: ["s9", undefined, undefined, undefined],
          tmuxSession: "op-agents-w1",
        },
      },
      windowOrder: ["w1"],
    };
    const out = mergeRegistry(legacy);
    expect(out.surfaces["OP-99"].sessionId).toBe("s9");
    expect(out.surfaces["OP-99"].agent).toBeUndefined();
  });

  it("drops a malformed agent block but keeps the surface", () => {
    // A surface-id mapping is the dashboard's primary key — losing it because
    // someone wrote nonsense into `agent` would break far more than it would
    // protect. Strip the `agent` block, keep the surface.
    const malformed = {
      surfaces: {
        "OP-7": {
          sessionId: "s7",
          windowId: "w1",
          cellIndex: 0,
          layoutId: "2x2",
          tmuxWindow: "OP-7",
          agent: { startTime: "not-a-number", model: 42 },
        },
      },
      windows: {},
      windowOrder: [],
    };
    const out = mergeRegistry(malformed);
    expect(out.surfaces["OP-7"].sessionId).toBe("s7");
    expect(out.surfaces["OP-7"].agent).toBeUndefined();
  });

  it("drops the agent block when individual optional fields are wrong-typed", () => {
    const malformed = {
      surfaces: {
        "OP-8": {
          sessionId: "s8",
          windowId: "w1",
          cellIndex: 0,
          layoutId: "2x2",
          tmuxWindow: "OP-8",
          agent: { startTime: 1, model: "ok", contextWindowSize: "200000" },
        },
      },
      windows: {},
      windowOrder: [],
    };
    const out = mergeRegistry(malformed);
    expect(out.surfaces["OP-8"].agent).toBeUndefined();
  });
});
