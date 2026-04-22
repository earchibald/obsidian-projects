// Layout definitions for the iTerm2 orchestrator.
//
// A layout is an ordered grid of cells, built from a single starting session
// by applying a sequence of splits. Splits reference previously-created cells
// by ordinal index. The orchestrator runs the sequence against iTerm, records
// each cell's resulting session id, then assigns cells to agents in order.
//
// Split directions match iTerm AppleScript: "vertical" creates a pane to the
// right of the target (a vertical divider); "horizontal" creates one below.

export type LayoutId = "1" | "1x2" | "3" | "2x2" | "2+3" | "2x3+2" | "3x3";

export const LAYOUT_IDS: readonly LayoutId[] = ["1", "1x2", "3", "2x2", "2+3", "2x3+2", "3x3"];

export type SplitDir = "vertical" | "horizontal";

export interface SplitOp {
  // Index of the existing cell (0-based) to split. Cell 0 is the window's
  // initial session. Each split appends a new cell whose index = cells.length
  // before the split ran.
  from: number;
  dir: SplitDir;
}

export interface LayoutSpec {
  id: LayoutId;
  cells: number;
  rows: number;
  cols: number;
  splits: SplitOp[];
}

// Layouts below are declarative; each SplitOp array produces `cells - 1`
// splits starting from cell 0, and the resulting cell order is the visual
// reading order (top-to-bottom, left-to-right) so agents land predictably.

export const LAYOUTS: Record<LayoutId, LayoutSpec> = {
  "1": { id: "1", cells: 1, rows: 1, cols: 1, splits: [] },

  "1x2": {
    id: "1x2",
    cells: 2,
    rows: 1,
    cols: 2,
    splits: [{ from: 0, dir: "vertical" }],
  },

  // Top full-width, bottom split into two.
  "3": {
    id: "3",
    cells: 3,
    rows: 2,
    cols: 2,
    splits: [
      { from: 0, dir: "horizontal" }, // cell 1 = bottom
      { from: 1, dir: "vertical" }, // cell 2 = bottom-right
    ],
  },

  // 2x2 grid. Order: TL, TR, BL, BR.
  "2x2": {
    id: "2x2",
    cells: 4,
    rows: 2,
    cols: 2,
    splits: [
      { from: 0, dir: "vertical" }, // cell 1 = TR
      { from: 0, dir: "horizontal" }, // cell 2 = BL
      { from: 1, dir: "horizontal" }, // cell 3 = BR
    ],
  },

  // 2 top + 3 bottom. Order: top-left, top-right, bot-left, bot-mid, bot-right.
  "2+3": {
    id: "2+3",
    cells: 5,
    rows: 2,
    cols: 3,
    splits: [
      { from: 0, dir: "horizontal" }, // cell 1 = bottom-full
      { from: 0, dir: "vertical" }, // cell 2 = top-right
      { from: 1, dir: "vertical" }, // cell 3 = bottom-middle
      { from: 3, dir: "vertical" }, // cell 4 = bottom-right
    ],
  },

  // Row of 2 on top, two rows of 3 below. Order visual reading.
  "2x3+2": {
    id: "2x3+2",
    cells: 8,
    rows: 3,
    cols: 3,
    splits: [
      { from: 0, dir: "horizontal" }, // cell 1 = middle-full
      { from: 1, dir: "horizontal" }, // cell 2 = bottom-full
      { from: 0, dir: "vertical" }, // cell 3 = top-right
      { from: 1, dir: "vertical" }, // cell 4 = middle-middle
      { from: 4, dir: "vertical" }, // cell 5 = middle-right
      { from: 2, dir: "vertical" }, // cell 6 = bottom-middle
      { from: 6, dir: "vertical" }, // cell 7 = bottom-right
    ],
  },

  // 3x3 grid. Order: row 0 L→R, row 1 L→R, row 2 L→R.
  "3x3": {
    id: "3x3",
    cells: 9,
    rows: 3,
    cols: 3,
    splits: [
      { from: 0, dir: "horizontal" }, // cell 1 = row1 full
      { from: 1, dir: "horizontal" }, // cell 2 = row2 full
      { from: 0, dir: "vertical" }, // cell 3 = r0 middle
      { from: 3, dir: "vertical" }, // cell 4 = r0 right
      { from: 1, dir: "vertical" }, // cell 5 = r1 middle
      { from: 5, dir: "vertical" }, // cell 6 = r1 right
      { from: 2, dir: "vertical" }, // cell 7 = r2 middle
      { from: 7, dir: "vertical" }, // cell 8 = r2 right
    ],
  },
};

// Reading-order index of each cell after applying splits. Cells are appended
// in split order; for most layouts the append order already matches reading
// order, but this exposes the mapping so the orchestrator can rely on it.
export function cellOrder(id: LayoutId): number[] {
  const spec = LAYOUTS[id];
  return Array.from({ length: spec.cells }, (_, i) => i);
}
