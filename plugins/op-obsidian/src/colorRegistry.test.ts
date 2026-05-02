import { describe, expect, it } from "vitest";
import { createColorRegistry } from "./colorRegistry";

describe("colorRegistry", () => {
  it("avoids duplicate colors within a window while colors remain available", () => {
    const registry = createColorRegistry(() => 0);
    expect(
      registry.assign({ issueId: "OP-1", windowKey: "iterm:w1", palette: ["red", "blue"] }),
    ).toBe("red");
    expect(
      registry.assign({ issueId: "OP-2", windowKey: "iterm:w1", palette: ["red", "blue"] }),
    ).toBe("blue");
  });

  it("inherits the parent issue color", () => {
    const registry = createColorRegistry(() => 0);
    expect(
      registry.assign({ issueId: "OP-1", windowKey: "iterm:w1", palette: ["red", "blue"] }),
    ).toBe("red");
    expect(
      registry.assign({
        issueId: "OP-1.1",
        parentId: "OP-1",
        windowKey: "iterm:w1",
        palette: ["red", "blue"],
      }),
    ).toBe("red");
  });

  it("rebuilds the window set on release so inherited colors stay reserved while a child remains", () => {
    const registry = createColorRegistry(() => 0);
    registry.assign({ issueId: "OP-1", windowKey: "iterm:w1", palette: ["red", "blue", "green"] });
    registry.assign({
      issueId: "OP-1.1",
      parentId: "OP-1",
      windowKey: "iterm:w1",
      palette: ["red", "blue", "green"],
    });
    registry.assign({ issueId: "OP-2", windowKey: "iterm:w1", palette: ["red", "blue", "green"] });
    registry.release("OP-1");

    expect(registry.snapshot().byWindow["iterm:w1"]).toEqual(["red", "blue"]);
  });

  it("falls back to reusing the palette when a window is full", () => {
    const registry = createColorRegistry(() => 0);
    expect(registry.assign({ issueId: "OP-1", windowKey: "iterm:w1", palette: ["red"] })).toBe("red");
    expect(registry.assign({ issueId: "OP-2", windowKey: "iterm:w1", palette: ["red"] })).toBe("red");
  });
});
