import { describe, it, expect } from "vitest";
import { detectTmux } from "./tmuxDetect";

describe("detectTmux", () => {
  it("returns first existing candidate", () => {
    const r = detectTmux(["/a", "/b", "/c"], (p) => p === "/b" || p === "/c");
    expect(r.path).toBe("/b");
  });

  it("returns null when none exist", () => {
    const r = detectTmux(["/a", "/b"], () => false);
    expect(r.path).toBeNull();
    expect(r.tried).toEqual(["/a", "/b"]);
  });
});
