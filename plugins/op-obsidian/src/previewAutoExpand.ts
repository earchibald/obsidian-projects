// OP-206 (3f): session-scoped launch counter for the LaunchAgentModal preview
// auto-expand policy. Module-level state — re-loads (and resets) on Obsidian
// restart, which matches the spec's "first three launches per session"
// definition. NOT persisted to settings; the persistent dismiss flag lives on
// `OpSettings.previewAutoExpandDismissed` and is consulted alongside this
// counter via `shouldAutoExpand` in `previewAutoExpandPure.ts`.
//
// Tests stub this module via `__resetSessionLaunchCount` rather than mutating
// the variable directly; the export keeps the seam intentional.

let sessionLaunchCount = 0;

/** Increment the session launch counter and return the new value (1 on first call). */
export function bumpSessionLaunchCount(): number {
  sessionLaunchCount += 1;
  return sessionLaunchCount;
}

/** Read the current counter without mutating. */
export function getSessionLaunchCount(): number {
  return sessionLaunchCount;
}

/** Test-only reset — never called from runtime. */
export function __resetSessionLaunchCount(): void {
  sessionLaunchCount = 0;
}
