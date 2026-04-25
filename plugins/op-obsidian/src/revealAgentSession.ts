import { execFile } from "child_process";
import { promisify } from "util";
import { notify } from "./notificationLog";

import type { OpSettings } from "./settings";
import { findAgentTmuxLocation } from "./agentTmuxLocation";
import { selectSession, sessionExists } from "./iterm/driver";

const pExecFile = promisify(execFile);

export async function revealAgentSession(
  settings: OpSettings,
  issueId: string,
): Promise<void> {
  // Orchestrator path: registry maps issueId → iTerm session id. If the
  // pane still exists, just select it.
  const surface = settings.orchestratorState?.surfaces?.[issueId];
  if (surface) {
    if (await sessionExists(surface.sessionId)) {
      await selectSession(surface.sessionId);
      return;
    }
  }

  // Tmux path: every launch lives in a window inside SHARED_TMUX_SESSION
  // (or a per-iTerm-window derivative). Select it and raise the terminal.
  const loc = await findAgentTmuxLocation(settings, issueId);
  if (loc) {
    try {
      await pExecFile(settings.tmuxBinary, [
        "select-window",
        "-t",
        `${loc.session}:${loc.window}`,
      ]);
      await activateTerminalApp(settings.terminal);
      return;
    } catch {
      // fall through to the not-found path
    }
  }

  notify(`op: no live session found for ${issueId}`);
}

async function activateTerminalApp(app: "Terminal" | "iTerm"): Promise<void> {
  const target = app === "iTerm" ? "iTerm2" : "Terminal";
  const script = `tell application "${target}" to activate`;
  try {
    await pExecFile("/usr/bin/osascript", ["-e", script]);
  } catch {
    // Best effort — if the terminal isn't running there's nothing to
    // reveal anyway; the tmux window exists but is detached.
  }
}
