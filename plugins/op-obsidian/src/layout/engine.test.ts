import { describe, expect, it } from "vitest";
import { maxLayoutForCeiling, pickLayout } from "./engine";

describe("pickLayout", () => {
  it("picks the smallest layout that fits the count", () => {
    expect(pickLayout(1, { maxRows: 3, maxCols: 3 })).toBe("1");
    expect(pickLayout(2, { maxRows: 3, maxCols: 3 })).toBe("1x2");
    expect(pickLayout(3, { maxRows: 3, maxCols: 3 })).toBe("3");
    expect(pickLayout(4, { maxRows: 3, maxCols: 3 })).toBe("2x2");
    expect(pickLayout(5, { maxRows: 3, maxCols: 3 })).toBe("2+3");
    expect(pickLayout(6, { maxRows: 3, maxCols: 3 })).toBe("2x3");
    expect(pickLayout(7, { maxRows: 3, maxCols: 3 })).toBe("2x3+2");
    expect(pickLayout(8, { maxRows: 3, maxCols: 3 })).toBe("2x3+2");
    expect(pickLayout(9, { maxRows: 3, maxCols: 3 })).toBe("3x3");
  });

  it("returns undefined when count exceeds every allowed layout", () => {
    expect(pickLayout(10, { maxRows: 3, maxCols: 3 })).toBeUndefined();
    expect(pickLayout(3, { maxRows: 1, maxCols: 2 })).toBeUndefined();
  });

  it("respects row/col ceilings", () => {
    expect(pickLayout(2, { maxRows: 1, maxCols: 2 })).toBe("1x2");
    // maxRows=1 rules out "3" (rows=2); count=3 with maxRows=1 is infeasible.
    expect(pickLayout(3, { maxRows: 1, maxCols: 3 })).toBeUndefined();
  });

  it("honors preferred layout when it fits", () => {
    expect(pickLayout(2, { maxRows: 3, maxCols: 3, preferred: "2x2" })).toBe("2x2");
    expect(pickLayout(1, { maxRows: 3, maxCols: 3, preferred: "3x3" })).toBe("3x3");
    // preferred too small → fall back to smallest fitting
    expect(pickLayout(5, { maxRows: 3, maxCols: 3, preferred: "1x2" })).toBe("2+3");
  });

  it("treats agentCount<1 as 1", () => {
    expect(pickLayout(0, { maxRows: 3, maxCols: 3 })).toBe("1");
  });
});

describe("maxLayoutForCeiling", () => {
  it("returns the largest fitting layout", () => {
    expect(maxLayoutForCeiling({ maxRows: 3, maxCols: 3 })).toBe("3x3");
    expect(maxLayoutForCeiling({ maxRows: 2, maxCols: 2 })).toBe("2x2");
    expect(maxLayoutForCeiling({ maxRows: 1, maxCols: 2 })).toBe("1x2");
    expect(maxLayoutForCeiling({ maxRows: 1, maxCols: 1 })).toBe("1");
  });
});
