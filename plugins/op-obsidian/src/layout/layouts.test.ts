import { describe, expect, it } from "vitest";
import { LAYOUTS, LAYOUT_IDS, cellOrder } from "./layouts";

describe("layouts", () => {
  it("each layout's split count matches cells - 1", () => {
    for (const id of LAYOUT_IDS) {
      const spec = LAYOUTS[id];
      expect(spec.splits).toHaveLength(spec.cells - 1);
    }
  });

  it("splits reference only already-created cells", () => {
    for (const id of LAYOUT_IDS) {
      const spec = LAYOUTS[id];
      // After applying split i, there are i+2 cells (started with 1).
      spec.splits.forEach((op, i) => {
        const cellsBefore = i + 1;
        expect(op.from).toBeLessThan(cellsBefore);
        expect(op.from).toBeGreaterThanOrEqual(0);
      });
    }
  });

  it("cellOrder is 0..cells-1", () => {
    expect(cellOrder("1")).toEqual([0]);
    expect(cellOrder("3x3")).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("layout dimensions are within 3x3", () => {
    for (const id of LAYOUT_IDS) {
      const spec = LAYOUTS[id];
      expect(spec.rows).toBeGreaterThanOrEqual(1);
      expect(spec.rows).toBeLessThanOrEqual(3);
      expect(spec.cols).toBeGreaterThanOrEqual(1);
      expect(spec.cols).toBeLessThanOrEqual(3);
    }
  });

  it("cell counts match named shapes", () => {
    expect(LAYOUTS["1"].cells).toBe(1);
    expect(LAYOUTS["1x2"].cells).toBe(2);
    expect(LAYOUTS["3"].cells).toBe(3);
    expect(LAYOUTS["2x2"].cells).toBe(4);
    expect(LAYOUTS["2+3"].cells).toBe(5);
    expect(LAYOUTS["2x3+2"].cells).toBe(8);
    expect(LAYOUTS["3x3"].cells).toBe(9);
  });
});
