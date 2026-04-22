import { LAYOUTS, type LayoutId, LAYOUT_IDS } from "./layouts";

export interface LayoutConstraint {
  // User-configured ceiling on rows / columns per iTerm window. Layouts that
  // exceed either dimension are skipped; overflow spills to a new window.
  maxRows: number;
  maxCols: number;
  // User-preferred default layout. Honored when it fits the agent count and
  // the row/col ceiling. Otherwise the smallest-fitting layout is chosen.
  preferred?: LayoutId;
}

// Pick the smallest layout that can hold `agentCount` agents within the
// user's row/col ceiling. Ties broken by preferred layout, else by the order
// in LAYOUT_IDS (smallest-first). Returns undefined if no layout fits — the
// caller should spill to a new window.
export function pickLayout(agentCount: number, c: LayoutConstraint): LayoutId | undefined {
  if (agentCount < 1) agentCount = 1;
  const candidates = LAYOUT_IDS
    .map((id) => LAYOUTS[id])
    .filter((l) => l.rows <= c.maxRows && l.cols <= c.maxCols && l.cells >= agentCount)
    .sort((a, b) => a.cells - b.cells);

  if (candidates.length === 0) return undefined;

  if (c.preferred) {
    const pref = candidates.find((l) => l.id === c.preferred);
    if (pref) return pref.id;
  }
  return candidates[0].id;
}

// Largest layout that fits the ceiling — used when sizing a window for the
// first agent and we want to reserve room for future agents on the same
// issue set without immediately spilling.
export function maxLayoutForCeiling(c: LayoutConstraint): LayoutId {
  const fits = LAYOUT_IDS
    .map((id) => LAYOUTS[id])
    .filter((l) => l.rows <= c.maxRows && l.cols <= c.maxCols)
    .sort((a, b) => b.cells - a.cells);
  return (fits[0]?.id ?? "1") as LayoutId;
}
