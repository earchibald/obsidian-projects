import { execFile } from "child_process";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { promisify } from "util";

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
    // iTerm window and drives AppleScript splits itself.
    const { orchestrateLaunch } = await import("./orchestrator");
    const r = await orchestrateLaunch(
      {
        issueId: args.issueId,
        issueTitle: args.issueTitle,
        agentId: args.agentId,
        cwd: args.cwd,
        binary: args.binary,
        launchFlags: args.launchFlags,
        prompt: args.prompt,
        debug: args.debug,
        tmuxBinary: args.tmuxBinary,
        baseTmuxSession: SHARED_TMUX_SESSION,
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

    const osa = buildITermOsascript(args.iTermPlacement, session, args.tmuxBinary);
    await pExecFile("/usr/bin/osascript", ["-e", osa]);
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

  const flagsShell = args.launchFlags.map(shSingleQuote).join(" ");
  const cwdShell = shSingleQuote(args.cwd);
  const binShell = shSingleQuote(args.binary);
  const promptShell = shSingleQuote(promptPath);
  const tmuxShell = shSingleQuote(args.tmuxBinary);
  const sessShell = shSingleQuote(session);

  // Inner: cd + read prompt from side-file (bash 3.2 heredoc-in-$() bug
  // otherwise, see OP-25) + exec the agent binary.
  //
  // Obsidian's launch PATH omits /opt/homebrew/bin and ~/.local/bin, so
  // `claude`'s statusLine (commonly `npx -y ccstatusline@latest`) silently
  // fails to resolve in spawned agent windows. Prepend the usual user-shell
  // dirs so statusline and other CLI tools behave as in a normal terminal.
  // See OP-41.
  const agentIdShell = shSingleQuote(args.agentId);
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
  const inner = innerLines.join("\n");
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

export function buildITermOsascript(
  placement: ITermPlacement,
  session: string,
  tmuxBinary: string = "tmux",
): string {
  // iTerm detects `tmux -CC` and surfaces tmux windows as native iTerm
  // tabs. Session/window prep already ran, so this just attaches.
  const tmuxCmd = `${shSingleQuote(tmuxBinary)} -CC attach -t ${shSingleQuote(session)}`;
  const cmd = osaQuote(tmuxCmd);

  if (placement === "new-window") {
    return [
      'tell application "iTerm"',
      "  activate",
      `  create window with default profile command ${cmd}`,
      "end tell",
    ].join("\n");
  }

  return [
    'tell application "iTerm"',
    "  activate",
    "  if (count of windows) = 0 then",
    `    create window with default profile command ${cmd}`,
    "  else",
    "    tell current window",
    `      create tab with default profile command ${cmd}`,
    "    end tell",
    "  end if",
    "end tell",
  ].join("\n");
}

// Sanitize arbitrary text into a tmux-safe window name. tmux uses `:`
// as the session:window separator in target specs, so we map it (and
// anything other than alnum/dash/underscore) to a dash, collapse runs,
// and trim. Falls back to "agent" for empty input.
export function tmuxWindowName(issueId: string): string {
  const safe = issueId
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return safe || "agent";
}

function shSingleQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

// AppleScript double-quoted string: escape backslashes and double quotes.
function osaQuote(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
