import { execFile } from "child_process";
import { promisify } from "util";
import type { IssueEntry } from "./types";
import { SHARED_TMUX_SESSION, tmuxWindowName } from "./terminalLaunch";

const pExecFile = promisify(execFile);

export interface TmuxProbeResult {
  /** Set of live tmux window names (`#W`) on the shared session. */
  live: Set<string>;
  /** True if the probe ran successfully. False on tmux missing / timeout / error. */
  ok: boolean;
}

/**
 * Pure: pick the issues whose `agent:` is set but whose tmux window is not
 * present on the shared session. Resolved/closed issues are skipped (their
 * agent fields are cleared by the resolve flow; if one slips through, the
 * fix is in the resolve path, not here).
 */
export function selectStaleAgentBadges(
  issues: ReadonlyArray<IssueEntry>,
  liveWindowNames: ReadonlySet<string>,
): IssueEntry[] {
  const stale: IssueEntry[] = [];
  for (const e of issues) {
    if (!e.agent) continue;
    if (e.resolvedFolder) continue;
    if (e.status === "resolved" || e.status === "wontfix") continue;
    if (!liveWindowNames.has(tmuxWindowName(e.id))) stale.push(e);
  }
  return stale;
}

/**
 * Probe `tmux list-windows -t op-agents -F '#W'` once. Returns the live window
 * names plus an `ok` flag — callers must treat `ok: false` as "unknown" and
 * skip stale-detection rather than emit false positives.
 *
 * Uses `execFile` (no shell) and a 500ms timeout, matching the spec's §1
 * implementation rule.
 */
export async function probeLiveTmuxWindows(tmuxBinary: string): Promise<TmuxProbeResult> {
  try {
    const { stdout } = await pExecFile(
      tmuxBinary,
      ["list-windows", "-t", SHARED_TMUX_SESSION, "-F", "#W"],
      { timeout: 500 },
    );
    const live = new Set(
      stdout
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    );
    return { live, ok: true };
  } catch {
    return { live: new Set(), ok: false };
  }
}
