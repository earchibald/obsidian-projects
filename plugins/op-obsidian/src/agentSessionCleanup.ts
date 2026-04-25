import { execFile } from "child_process";
import { promisify } from "util";

import type { RegistryData, SurfaceRef } from "./layout/registry";
import { SHARED_TMUX_SESSION, tmuxWindowName } from "./terminalLaunch";

const pExecFile = promisify(execFile);

export interface PruneResult {
  removed: Record<string, SurfaceRef>;
}

// Drop a single issue's surface from the registry and free its cell. Pure.
export function pruneRegistryForIssue(reg: RegistryData, issueId: string): PruneResult {
  const removed: Record<string, SurfaceRef> = {};
  const ref = reg.surfaces[issueId];
  if (!ref) return { removed };
  removed[issueId] = ref;
  delete reg.surfaces[issueId];
  const win = reg.windows[ref.windowId];
  if (win && win.sessionIds[ref.cellIndex] === ref.sessionId) {
    win.sessionIds[ref.cellIndex] = undefined;
  }
  return { removed };
}

// Drop every surface whose issueId is not in the known-alive set. Pure.
export function pruneRegistryMissingIssues(
  reg: RegistryData,
  aliveIds: ReadonlySet<string>,
): PruneResult {
  const removed: Record<string, SurfaceRef> = {};
  for (const issueId of Object.keys(reg.surfaces)) {
    if (aliveIds.has(issueId)) continue;
    const { removed: r } = pruneRegistryForIssue(reg, issueId);
    Object.assign(removed, r);
  }
  return { removed };
}

// Collect the distinct tmux sessions that may host an agent window for the
// given issueId. Always includes the legacy shared session; adds the
// per-window sessions tracked in the registry.
export function tmuxSessionsForCleanup(reg: RegistryData): string[] {
  const out = new Set<string>([SHARED_TMUX_SESSION]);
  for (const w of Object.values(reg.windows)) {
    if (w.tmuxSession) out.add(w.tmuxSession);
  }
  return [...out];
}

export async function killTmuxWindow(
  tmuxBinary: string,
  session: string,
  windowName: string,
): Promise<boolean> {
  try {
    await pExecFile(tmuxBinary, ["kill-window", "-t", `${session}:${windowName}`]);
    return true;
  } catch {
    // Window or session absent — nothing to do. Matches tmux's exit=1 when
    // the target doesn't exist.
    return false;
  }
}

export interface CleanupArgs {
  tmuxBinary: string;
  reg: RegistryData;
  issueIds: string[];
  // Best-effort closer for an iTerm window when its last cell is freed.
  // Optional so unit tests and non-iTerm code paths can opt out — when
  // omitted, empty windows are still removed from the registry but the
  // physical iTerm window is left alone.
  closeITermWindow?: (windowId: string) => Promise<void>;
}

export interface CleanupResult {
  killed: Array<{ issueId: string; session: string; window: string }>;
  prunedSurfaces: string[];
  // iTerm windowIds that were emptied by this cleanup and (best-effort) closed.
  closedWindows: string[];
}

// Kill every tmux window whose name derives from one of the given issueIds,
// across the legacy shared session and all registry-tracked sessions; then
// prune the registry entries. The registry is mutated in place; caller is
// responsible for persisting it.
export async function cleanupAgentSessions(args: CleanupArgs): Promise<CleanupResult> {
  const sessions = tmuxSessionsForCleanup(args.reg);
  const killed: CleanupResult["killed"] = [];
  for (const issueId of args.issueIds) {
    const windowName = tmuxWindowName(issueId);
    for (const session of sessions) {
      const ok = await killTmuxWindow(args.tmuxBinary, session, windowName);
      if (ok) killed.push({ issueId, session, window: windowName });
    }
  }
  const prunedSurfaces: string[] = [];
  for (const issueId of args.issueIds) {
    const { removed } = pruneRegistryForIssue(args.reg, issueId);
    prunedSurfaces.push(...Object.keys(removed));
  }

  // Any window whose last cell was just freed becomes an orphan: its tmux
  // session died with its last window, leaving iTerm panes attached to a dead
  // session. Close the iTerm window so the user doesn't see clutter, then
  // drop the WindowState so the next launch isn't tempted to reuse the dead
  // surface. OP-110.
  const closedWindows: string[] = [];
  const emptyWindowIds = Object.values(args.reg.windows)
    .filter((w) => w.sessionIds.every((s) => !s))
    .map((w) => w.windowId);
  for (const windowId of emptyWindowIds) {
    if (args.closeITermWindow) {
      try {
        await args.closeITermWindow(windowId);
        closedWindows.push(windowId);
      } catch (err) {
        console.warn(
          `[op-obsidian] closeITermWindow best-effort failed (window=${windowId}): ${
            err instanceof Error ? err.message.split("\n")[0] : String(err)
          }`,
        );
      }
    }
    delete args.reg.windows[windowId];
    args.reg.windowOrder = args.reg.windowOrder.filter((id) => id !== windowId);
    for (const [issueId, ref] of Object.entries(args.reg.surfaces)) {
      if (ref.windowId === windowId) delete args.reg.surfaces[issueId];
    }
  }

  return { killed, prunedSurfaces, closedWindows };
}
