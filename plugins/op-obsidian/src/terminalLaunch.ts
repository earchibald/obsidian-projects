import { execFile } from "child_process";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { promisify } from "util";

import { activeWindowId, createTab, createWindow } from "./iterm/driver";
import { slugify } from "./slug";

const pExecFile = promisify(execFile);

export type ITermPlacement = "new-tab" | "new-window";

// All op-obsidian agents share one tmux session; each agent is a window
// inside it, named by issueId. Windows (not sessions) are the per-agent
// unit — one shared session means one place to reattach everything.
export const SHARED_TMUX_SESSION = "op-agents";

export interface LaunchArgs {
  cwd: string;
  binary: string;
  launchFlags: string[];
  prompt: string;
  terminalApp: "Terminal" | "iTerm";
  iTermPlacement: ITermPlacement;
  // Debug mode: skip running the agent; drop into an interactive login
  // shell in the tmux window so the launch flow can be exercised manually.
  debug?: boolean;
  // Absolute path or bare name of the tmux binary. Obsidian's PATH omits
  // /opt/homebrew/bin, so bare `tmux` fails on Apple Silicon brew installs.
  tmuxBinary: string;
  // Exported into the agent's env so SessionEnd hooks can identify which
  // op-obsidian issue/agent a terminating session belongs to. Optional —
  // entry-less launches (e.g. the workflow editor) leave it unset and the
  // hook silently no-ops.
  issueId?: string;
  // Human-readable title forwarded to the orchestrator for the iTerm
  // session/pane title (e.g. the issue note's file basename).
  issueTitle?: string;
  // OP-179: parent issue id forwarded to the orchestrator. When set, the
  // iTerm tab/window/session label gets a ` [Parent: <PARENT-ID>]` suffix so
  // a child issue's pane is visibly tagged with its umbrella.
  parentId?: string;
  agentId: string;
  // Override the tmux window name (sanitized to tmux-safe chars). Used by
  // entry-less launches that have no `issueId` — the workflow editor
  // passes `op-workflow-<slug>` here so its window doesn't collide with
  // any issue session.
  windowName?: string;
  // Debug mode: skip running the agent; drop into an interactive login shell
  // in the tmux window so the launch flow can be exercised manually (OP-43).
  debug?: boolean;
  // When present and `terminalApp === "iTerm"`, launch routes through the
  // layout orchestrator (one iTerm pane per agent) instead of the legacy
  // tmux -CC single-window attach.
  orchestrator?: {
    settings: import("./settingsPure").OpSettings;
    registry: import("./orchestrator").RegistryIO;
  };
  // OP-155 §4 Step 1: when true and `terminalApp === "iTerm"`, the launch
  // does not bring iTerm to the foreground. iTerm is started (if needed)
  // via `open -ga iTerm` and the WebSocket `CreateTab`/`CreateWindow` call
  // skips the `ActivateRequest`. No effect on Terminal.app — Terminal has
  // no equivalent non-activating launch path. Defaults to false.
  backgroundLaunch?: boolean;
}

export interface LaunchResult {
  scriptPath: string;
  tmuxSession: string;
  tmuxWindow: string;
}

export async function launchInTerminal(args: LaunchArgs): Promise<LaunchResult> {
  if (process.platform !== "darwin") {
    throw new Error(`op: terminal launch currently supports macOS only (platform=${process.platform})`);
  }
  await assertTmuxAvailable(args.tmuxBinary);
  if (!args.issueId && !args.windowName) {
    throw new Error("op: launchInTerminal requires issueId or windowName");
  }

  const session = SHARED_TMUX_SESSION;
  const windowName = tmuxWindowName(args.windowName ?? args.issueId ?? "agent");
  const { innerPath, outerPath } = await writeLaunchScripts({ args, session, windowName });

  if (
    args.terminalApp === "iTerm" &&
    args.orchestrator?.settings.orchestrator.enabled &&
    args.issueId
  ) {
    // Layout orchestrator takes over: it manages tmux session naming per
    // iTerm window and drives the iTerm WebSocket splits itself.
    const { orchestrateLaunch } = await import("./orchestrator");
    const r = await orchestrateLaunch(
      {
        issueId: args.issueId,
        issueTitle: args.issueTitle,
        parentId: args.parentId,
        agentId: args.agentId,
        cwd: args.cwd,
        binary: args.binary,
        launchFlags: args.launchFlags,
        prompt: args.prompt,
        debug: args.debug,
        tmuxBinary: args.tmuxBinary,
        baseTmuxSession: SHARED_TMUX_SESSION,
        backgroundLaunch: args.backgroundLaunch,
      },
      args.orchestrator.settings,
      args.orchestrator.registry,
    );
    return {
      scriptPath: r.scriptPath,
      tmuxSession: r.tmuxSession,
      tmuxWindow: r.tmuxWindow,
    };
  }

  if (args.terminalApp === "iTerm") {
    // Run session/window prep synchronously so the shared session and the
    // agent's window exist before we hand iTerm a -CC attach command.
    await runPrep(args.tmuxBinary, session, windowName, innerPath);

    // If a tmux client is already attached (e.g. an existing iTerm -CC
    // window), the new-window call above already surfaced as a new tab
    // there — another -CC attach would just mirror the session in a
    // second iTerm window. Only launch iTerm when nothing is attached.
    if (await isSessionAttached(args.tmuxBinary, session)) {
      return { scriptPath: innerPath, tmuxSession: session, tmuxWindow: windowName };
    }

    // OP-155 §4 Step 1: in background-launch mode, ensure iTerm is running
    // without activating it (`-g` = launch in background, `-a` = by app name)
    // before opening the WS connection. Skipping this on a cold-start would
    // race the WS connect against macOS's app-launch slot — and even when
    // iTerm comes up, the connect might happen before the API server is
    // listening. `open -ga` returns synchronously once the app has been
    // launched; the WS client then activates iTerm via Activate{App} only if
    // we ask it to (we don't, in background mode).
    const wsActivate = !args.backgroundLaunch;
    if (args.backgroundLaunch) {
      await pExecFile("/usr/bin/open", ["-ga", "iTerm"]);
    }
    const command = buildITermAttachCommand(args.tmuxBinary, session);
    if (args.iTermPlacement === "new-tab") {
      const targetWindow = await activeWindowId();
      if (targetWindow) {
        await createTab(command, targetWindow, { activate: wsActivate });
      } else {
        // No iTerm window is currently key (iTerm not running, all windows
        // minimized, etc.) — fall back to opening a new window. Mirrors the
        // legacy AppleScript `if (count of windows) = 0 then create window`.
        await createWindow(command, { activate: wsActivate });
      }
    } else {
      await createWindow(command, { activate: wsActivate });
    }
    return { scriptPath: innerPath, tmuxSession: session, tmuxWindow: windowName };
  }

  // Terminal.app has no tmux control-mode integration, so each launch
  // opens its own Terminal window attached to the shared session.
  // Multiple attached clients mirror each other — accepted trade-off.
  await pExecFile("/usr/bin/open", ["-a", "Terminal", outerPath]);
  return { scriptPath: innerPath, tmuxSession: session, tmuxWindow: windowName };
}

async function assertTmuxAvailable(tmuxBinary: string): Promise<void> {
  try {
    await pExecFile(tmuxBinary, ["-V"]);
  } catch {
    throw new Error(
      `op: tmux not runnable at "${tmuxBinary}" — install with \`brew install tmux\` ` +
        `or set the tmux binary path in op settings (e.g. /opt/homebrew/bin/tmux).`,
    );
  }
}

async function runPrep(
  tmuxBinary: string,
  session: string,
  windowName: string,
  innerPath: string,
): Promise<void> {
  const script = buildPrepScript({ tmuxBinary, session, windowName, innerPath });
  await pExecFile("/bin/bash", ["-c", script]);
}

async function isSessionAttached(tmuxBinary: string, session: string): Promise<boolean> {
  try {
    const { stdout } = await pExecFile(tmuxBinary, ["list-clients", "-t", session]);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

interface WriteScriptsArgs {
  args: LaunchArgs;
  session: string;
  windowName: string;
}

async function writeLaunchScripts({
  args,
  session,
  windowName,
}: WriteScriptsArgs): Promise<{ innerPath: string; outerPath: string }> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "op-agent-"));
  const innerPath = path.join(dir, "agent.command");
  const outerPath = path.join(dir, "launch.command");
  const promptPath = path.join(dir, "prompt.txt");

  await fs.writeFile(promptPath, args.prompt, { mode: 0o600 });

  const tmuxShell = shSingleQuote(args.tmuxBinary);
  const sessShell = shSingleQuote(session);

  const inner = buildInnerScript({ args, promptPath });
  await fs.writeFile(innerPath, inner, { mode: 0o755 });

  // Outer (Terminal.app only): ensure session/window exists, then attach.
  const prep = buildPrepScript({
    tmuxBinary: args.tmuxBinary,
    session,
    windowName,
    innerPath,
  });
  const outer = [
    "#!/bin/bash",
    "set -e",
    prep,
    `exec ${tmuxShell} attach -t ${sessShell}`,
    "",
  ].join("\n");
  await fs.writeFile(outerPath, outer, { mode: 0o755 });

  return { innerPath, outerPath };
}

interface InnerScriptArgs {
  args: LaunchArgs;
  promptPath: string;
}

// Build the inner agent script that runs inside the tmux pane: cd, env
// exports, optional iTerm session-tag emit (OP-233), then exec the agent
// binary. Pure string-building — no fs — so it's exercised by unit tests
// without touching disk.
export function buildInnerScript({ args, promptPath }: InnerScriptArgs): string {
  const flagsShell = args.launchFlags.map(shSingleQuote).join(" ");
  const cwdShell = shSingleQuote(args.cwd);
  const binShell = shSingleQuote(args.binary);
  const promptShell = shSingleQuote(promptPath);
  const agentIdShell = shSingleQuote(args.agentId);

  // Inner: cd + read prompt from side-file (bash 3.2 heredoc-in-$() bug
  // otherwise, see OP-25) + exec the agent binary.
  //
  // Obsidian's launch PATH omits /opt/homebrew/bin and ~/.local/bin, so
  // `claude`'s statusLine (commonly `npx -y ccstatusline@latest`) silently
  // fails to resolve in spawned agent windows. Prepend the usual user-shell
  // dirs so statusline and other CLI tools behave as in a normal terminal.
  // See OP-41.
  const innerLines = [
    "#!/bin/bash",
    "set -e",
    `cd ${cwdShell}`,
    `export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$HOME/bin:$PATH"`,
  ];
  if (args.issueId) {
    innerLines.push(`export OP_ISSUE_ID=${shSingleQuote(args.issueId)}`);
  }
  innerLines.push(`export OP_AGENT_ID=${agentIdShell}`);
  // OP-233: tag the iTerm session with `user.op_issue` so op-dashboard
  // (OP-230) can correlate iTerm sessions to op issues. We compute the
  // base64 at script-build time (Node Buffer) so the runtime script doesn't
  // depend on `base64` being on PATH and to avoid platform-specific line
  // wrapping. `\007` (BEL) terminates the OSC; `\033` is ESC. Under tmux
  // -CC iTerm parses pane bytes directly, so we don't wrap in a tmux
  // passthrough sequence — that wrap would also need allow-passthrough.
  // Terminal.app silently ignores OSC 1337, so the emit is harmless there.
  if (args.issueId) {
    const b64 = Buffer.from(args.issueId, "utf8").toString("base64");
    innerLines.push(`printf '\\033]1337;SetUserVar=op_issue=%s\\007' ${shSingleQuote(b64)}`);
  }
  if (args.debug) {
    // Launch the agent binary interactively with no initial prompt so
    // the launch flow (PATH, env, tmux window) can be exercised end-to-end
    // while a human drives the session.
    innerLines.push(
      `echo "[op] debug agent launch — no prompt (issue=${args.issueId ?? "<none>"} agent=${args.agentId})"`,
      `exec ${binShell} ${flagsShell}`,
    );
  } else {
    innerLines.push(
      `PROMPT=$(<${promptShell})`,
      `exec ${binShell} ${flagsShell} "$PROMPT"`,
    );
  }
  innerLines.push("");
  return innerLines.join("\n");
}

interface PrepArgs {
  tmuxBinary: string;
  session: string;
  windowName: string;
  innerPath: string;
}

// Bash snippet: if the shared session is missing, create it detached
// with the agent's window running the inner script. If a window with
// this issue's name already exists, select it (reattach semantics).
// Otherwise create a new window running the inner script. `grep -Fxq`
// ensures a window named `OP-3` doesn't match `OP-31`.
export function buildPrepScript({ tmuxBinary, session, windowName, innerPath }: PrepArgs): string {
  const tmux = shSingleQuote(tmuxBinary);
  const sess = shSingleQuote(session);
  const wname = shSingleQuote(windowName);
  const inner = shSingleQuote(innerPath);
  return [
    `if ! ${tmux} has-session -t ${sess} 2>/dev/null; then`,
    `  ${tmux} new-session -d -s ${sess} -n ${wname} bash ${inner}`,
    `elif ${tmux} list-windows -t ${sess} -F '#W' | grep -Fxq ${wname}; then`,
    `  ${tmux} select-window -t ${sess}:${wname}`,
    `else`,
    `  ${tmux} new-window -t ${sess} -n ${wname} bash ${inner}`,
    `fi`,
  ].join("\n");
}

// Build the bash command line iTerm runs in the new tab/window. iTerm detects
// `tmux -CC` on the running command and surfaces tmux windows as native iTerm
// tabs; session/window prep already ran, so this just attaches. Quoting mirrors
// the legacy AppleScript path so a tmux binary at `/opt/homebrew/bin/tmux` and
// a session name with shell metacharacters are still safe.
export function buildITermAttachCommand(tmuxBinary: string, session: string): string {
  return `${shSingleQuote(tmuxBinary)} -CC attach -t ${shSingleQuote(session)}`;
}

// Sanitize arbitrary text into a tmux-safe window name. tmux uses `:`
// as the session:window separator in target specs, so we map it (and
// anything other than alnum/dash/underscore) to a dash, collapse runs,
// and trim. Falls back to "agent" for empty input. Case is preserved
// because users grep tmux windows by issue id (`OP-220`), which is
// upper-case by convention.
export function tmuxWindowName(issueId: string): string {
  return slugify(issueId, { allowUnderscore: true, fallback: "agent" });
}

function shSingleQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}
