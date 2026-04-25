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
 * Probe `tmux list-windows -t <session> -F '#W'` for each given session.
 * Returns the union of live window names plus an `ok` flag — callers must
 * treat `ok: false` as "unknown" and skip stale-detection rather than emit
 * false positives.
 *
 * Uses `execFile` (no shell) and a 500ms timeout per session, matching the
 * spec's §1 implementation rule.  Passing multiple sessions (shared session
 * + per-window sessions from the orchestrator registry) mirrors what
 * `agentSessionCleanup.ts` does when killing windows.
 *
 * Error semantics:
 *   - tmux binary missing (ENOENT) or timeout → `ok: false` (abort entire probe)
 *   - session absent (tmux exits non-zero) → treat as 0 live windows; continue
 */
export async function probeLiveTmuxWindows(
  tmuxBinary: string,
  sessions: string[] = [SHARED_TMUX_SESSION],
): Promise<TmuxProbeResult> {
  const live = new Set<string>();
  for (const session of sessions) {
    try {
      const { stdout } = await pExecFile(
        tmuxBinary,
        ["list-windows", "-t", session, "-F", "#W"],
        { timeout: 500 },
      );
      for (const name of stdout.split("\n").map((s) => s.trim()).filter(Boolean)) {
        live.add(name);
      }
    } catch (err: any) {
      // Binary missing or timeout → abort; we'd surface false positives otherwise.
      if (err?.code === "ENOENT" || err?.killed) {
        return { live: new Set(), ok: false };
      }
      // Session absent (tmux exits with non-zero code) — zero windows; continue.
    }
  }
  return { live, ok: true };
}
