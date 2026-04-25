import { execFile } from "child_process";
import { promisify } from "util";

import type { OpSettings } from "./settings";
import { SHARED_TMUX_SESSION, tmuxWindowName } from "./terminalLaunch";

const pExecFile = promisify(execFile);

export interface AgentTmuxLocation {
  session: string;
  window: string;
}

/**
 * Resolve an issue id to the (session, window) pair of its live tmux pane,
 * or null if no candidate session contains the expected window. Iterates
 * the shared session plus every per-iTerm-window orchestrator session,
 * returning the first match.
 *
 * Pure read — never mutates tmux state. Suitable for hover-preview captures
 * as well as `revealAgentSession`'s select-window flow.
 */
export async function findAgentTmuxLocation(
  settings: OpSettings,
  issueId: string,
): Promise<AgentTmuxLocation | null> {
  const surface = settings.orchestratorState?.surfaces?.[issueId];
  const windowName = tmuxWindowName(issueId);
  for (const session of uniqueSessions(settings, surface?.sessionId)) {
    if (await tmuxWindowExists(settings.tmuxBinary, session, windowName)) {
      return { session, window: windowName };
    }
  }
  return null;
}

export function uniqueSessions(settings: OpSettings, extra?: string): string[] {
  const out = new Set<string>([SHARED_TMUX_SESSION]);
  for (const w of Object.values(settings.orchestratorState?.windows ?? {})) {
    if (w?.tmuxSession) out.add(w.tmuxSession);
  }
  if (extra) out.add(extra);
  return [...out];
}

async function tmuxWindowExists(
  tmuxBinary: string,
  session: string,
  windowName: string,
): Promise<boolean> {
  try {
    const { stdout } = await pExecFile(tmuxBinary, [
      "list-windows",
      "-t",
      session,
      "-F",
      "#W",
    ]);
    return stdout.split("\n").map((l) => l.trim()).includes(windowName);
  } catch {
    return false;
  }
}
