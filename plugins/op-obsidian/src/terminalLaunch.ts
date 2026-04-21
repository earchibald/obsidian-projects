import { execFile } from "child_process";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { promisify } from "util";

const pExecFile = promisify(execFile);

export type ITermPlacement = "new-tab" | "new-window";

export interface LaunchArgs {
  cwd: string;
  binary: string;
  launchFlags: string[];
  prompt: string;
  terminalApp: "Terminal" | "iTerm";
  tmuxSession: string;
  iTermPlacement: ITermPlacement;
  // Absolute path or bare name of the tmux binary. Obsidian's PATH omits
  // /opt/homebrew/bin, so bare `tmux` fails on Apple Silicon brew installs.
  tmuxBinary: string;
}

export interface LaunchResult {
  scriptPath: string;
  tmuxSession: string;
}

// Launches the agent inside a named tmux session so the process survives the
// terminal window being closed and can be re-attached by name. iTerm uses
// tmux -CC (control mode) so tmux windows render as native iTerm tabs;
// Terminal.app uses plain tmux since it has no control-mode integration.
export async function launchInTerminal(args: LaunchArgs): Promise<LaunchResult> {
  if (process.platform !== "darwin") {
    throw new Error(`op: terminal launch currently supports macOS only (platform=${process.platform})`);
  }
  await assertTmuxAvailable(args.tmuxBinary);

  const { innerPath, outerPath } = await writeLaunchScripts(args);

  if (args.terminalApp === "iTerm") {
    const osa = buildITermOsascript(args.iTermPlacement, args.tmuxSession, innerPath, args.tmuxBinary);
    await pExecFile("/usr/bin/osascript", ["-e", osa]);
    return { scriptPath: innerPath, tmuxSession: args.tmuxSession };
  }

  await pExecFile("/usr/bin/open", ["-a", "Terminal", outerPath]);
  return { scriptPath: innerPath, tmuxSession: args.tmuxSession };
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

async function writeLaunchScripts(args: LaunchArgs): Promise<{ innerPath: string; outerPath: string }> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "op-agent-"));
  const innerPath = path.join(dir, "agent.command");
  const outerPath = path.join(dir, "launch.command");
  const promptPath = path.join(dir, "prompt.txt");

  await fs.writeFile(promptPath, args.prompt, { mode: 0o600 });

  const flagsShell = args.launchFlags.map(shSingleQuote).join(" ");
  const cwdShell = shSingleQuote(args.cwd);
  const binShell = shSingleQuote(args.binary);
  const promptShell = shSingleQuote(promptPath);
  const sessShell = shSingleQuote(args.tmuxSession);
  const innerShell = shSingleQuote(innerPath);
  const tmuxShell = shSingleQuote(args.tmuxBinary);

  // Inner: cd + read prompt from side-file (bash 3.2 heredoc-in-$() bug
  // otherwise, see OP-25) + exec the agent binary.
  const inner = [
    "#!/bin/bash",
    "set -e",
    `cd ${cwdShell}`,
    `PROMPT=$(<${promptShell})`,
    `exec ${binShell} ${flagsShell} "$PROMPT"`,
    "",
  ].join("\n");
  await fs.writeFile(innerPath, inner, { mode: 0o755 });

  // Outer (Terminal.app only): tmux attach-or-create, run inner inside it.
  // tmux -A means "attach if session with this name already exists",
  // so re-launching the agent for the same issue reattaches the live session.
  const outer = [
    "#!/bin/bash",
    "set -e",
    `exec ${tmuxShell} new-session -A -s ${sessShell} bash ${innerShell}`,
    "",
  ].join("\n");
  await fs.writeFile(outerPath, outer, { mode: 0o755 });

  return { innerPath, outerPath };
}

export function buildITermOsascript(
  placement: ITermPlacement,
  session: string,
  innerScriptPath: string,
  tmuxBinary: string = "tmux",
): string {
  // iTerm detects `tmux -CC` and surfaces tmux windows as native iTerm
  // tabs/windows (control mode).
  const tmuxCmd = `${shSingleQuote(tmuxBinary)} -CC new-session -A -s ${shSingleQuote(session)} ${shSingleQuote(`bash ${innerScriptPath}`)}`;
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

// Sanitize arbitrary text into a tmux-safe session name. tmux forbids
// periods and colons; we map everything that isn't alnum/dash/underscore
// to a dash, collapse runs, and trim.
export function tmuxSessionName(issueId: string): string {
  const safe = issueId
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `op-${safe || "agent"}`;
}

function shSingleQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

// AppleScript double-quoted string: escape backslashes and double quotes.
function osaQuote(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
