// OP-206 (3f): pure auto-expand policy for the LaunchAgentModal's
// "Composed prompt preview" disclosure. The launch modal asks this function
// once at `onOpen` whether the panel should start expanded.
//
// Spec: auto-expand on the FIRST THREE launches per Obsidian session, unless
// the user has dismissed the auto-expand affordance. The dismiss is persisted
// (settings); the launch counter is session-scoped (in-memory module state in
// `previewAutoExpand.ts`). Decoupling the policy from both stores lets vitest
// drive the boundary cases without fighting Obsidian or persistence.

export interface ShouldAutoExpandArgs {
  /**
   * 1-based launch counter for this Obsidian session (the count of launches
   * including the current one — bump *before* calling). The first launch
   * passes `1`, the third passes `3`, the fourth passes `4`.
   */
  sessionLaunchCount: number;
  /** Persisted user preference. `true` → never auto-expand. */
  dismissed: boolean;
}

/**
 * Decide whether the LaunchAgentModal preview disclosure should start
 * expanded. Returns `true` for the first three launches per session unless
 * the user has dismissed the affordance, in which case it always returns
 * `false`. Out-of-range counters (≤ 0) coerce to "no auto-expand" so a
 * malformed caller can't accidentally trigger expansion.
 */
export function shouldAutoExpand(args: ShouldAutoExpandArgs): boolean {
  if (args.dismissed) return false;
  if (!Number.isFinite(args.sessionLaunchCount)) return false;
  if (args.sessionLaunchCount < 1) return false;
  return args.sessionLaunchCount <= 3;
}
