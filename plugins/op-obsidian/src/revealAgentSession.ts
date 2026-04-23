import { execFile } from "child_process";
import { promisify } from "util";
import { Notice } from "obsidian";

import type { OpSettings } from "./settings";
import { SHARED_TMUX_SESSION, tmuxWindowName } from "./terminalLaunch";
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
    if (await sessionExists(settings, surface.sessionId)) {
      await selectSession(settings, surface.sessionId);
      return;
    }
  }

  // Tmux path: every launch lives in a window inside SHARED_TMUX_SESSION
  // (or a per-iTerm-window derivative). Select it and raise the terminal.
  const windowName = tmuxWindowName(issueId);
  const sessionCandidates = uniqueSessions(settings, surface?.sessionId);

  for (const session of sessionCandidates) {
    if (await tmuxSelectWindow(settings.tmuxBinary, session, windowName)) {
      await activateTerminalApp(settings.terminal);
      return;
    }
  }

  new Notice(`op: no live session found for ${issueId}`);
}

function uniqueSessions(settings: OpSettings, extra?: string): string[] {
  const out = new Set<string>([SHARED_TMUX_SESSION]);
  for (const w of Object.values(settings.orchestratorState?.windows ?? {})) {
    if (w?.tmuxSession) out.add(w.tmuxSession);
  }
  if (extra) out.add(extra);
  return [...out];
}

async function tmuxSelectWindow(
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
    const windows = stdout.split("\n").map((l) => l.trim());
    if (!windows.includes(windowName)) return false;
    await pExecFile(tmuxBinary, [
      "select-window",
      "-t",
      `${session}:${windowName}`,
    ]);
    return true;
  } catch {
    return false;
  }
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
