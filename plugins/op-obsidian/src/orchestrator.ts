import { execFile } from "child_process";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { promisify } from "util";

import { LAYOUTS, type LayoutId } from "./layout/layouts";
import type { RegistryData, SurfaceRef, WindowState } from "./layout/registry";
import { activeWindow, addWindow, assignSurface } from "./layout/registry";
import { createWindow, selectSession, sessionExists, splitSession } from "./iterm/applescript";
import { buildPrepScript, tmuxWindowName } from "./terminalLaunch";

const pExecFile = promisify(execFile);

// The orchestrator assigns one iTerm pane per agent, laid out according to
// the configured ceiling layout. Under the hood each agent runs inside a
// tmux window of a per-iTerm-window tmux session; the pane itself attaches
// to a grouped tmux session so each pane can independently display its own
// window. Restarting Obsidian or iTerm detaches panes but the tmux session
// survives — re-launching the agent reselects the existing surface.

export interface OrchestratorSettings {
  enabled: boolean;
  maxRows: number;
  maxCols: number;
  preferred: LayoutId;
}

export interface OrchestrateArgs {
  issueId: string;
  agentId: string;
  cwd: string;
  binary: string;
  launchFlags: string[];
  prompt: string;
  debug?: boolean;
  tmuxBinary: string;
  // Session name for the "work" tmux session in use. The orchestrator also
  // derives per-window tmux sessions (e.g. op-agents-1, op-agents-2).
  baseTmuxSession: string;
}

export interface OrchestrateResult {
  scriptPath: string;
  tmuxSession: string;
  tmuxWindow: string;
  windowId: string;
  sessionId: string;
  cellIndex: number;
  layoutId: LayoutId;
}

export interface RegistryIO {
  get: () => RegistryData;
  save: (reg: RegistryData) => Promise<void>;
}

export async function orchestrateLaunch(
  args: OrchestrateArgs,
  settings: OrchestratorSettings,
  registry: RegistryIO,
): Promise<OrchestrateResult> {
  const reg = registry.get();

  // Re-launching an existing issue: if the session still exists in iTerm,
  // just select it. Otherwise fall through to fresh assignment — the user
  // likely closed the pane, and the issueId → session mapping is stale.
  const existing = reg.surfaces[args.issueId];
  if (existing && (await sessionExists(existing.sessionId))) {
    await selectSession(existing.sessionId);
    // tmux window still owns the agent process; the pane just reattaches.
    const scriptPath = await writeViewScript({
      args,
      tmuxSession: reg.windows[existing.windowId]?.tmuxSession ?? args.baseTmuxSession,
      tmuxWindow: existing.tmuxWindow,
    });
    return {
      scriptPath,
      tmuxSession: reg.windows[existing.windowId]?.tmuxSession ?? args.baseTmuxSession,
      tmuxWindow: existing.tmuxWindow,
      windowId: existing.windowId,
      sessionId: existing.sessionId,
      cellIndex: existing.cellIndex,
      layoutId: existing.layoutId,
    };
  }

  const ceiling: LayoutId = settings.preferred;
  const spec = LAYOUTS[ceiling];
  const windowName = tmuxWindowName(args.issueId);

  // Active window = last window in registry that isn't full and still exists
  // in iTerm. If the user closed all iTerm windows, the registry's parent
  // sessions are stale ghosts — splitting them throws "session not found".
  // Detect that here, prune the dead windows + their surface refs, and fall
  // through to the new-window path.
  let win = activeWindow(reg);
  while (win) {
    if (win.sessionIds.filter(Boolean).length >= LAYOUTS[win.layoutId].cells) {
      win = undefined;
      break;
    }
    const probe = win.sessionIds.find((s): s is string => typeof s === "string");
    if (probe && !(await sessionExists(probe))) {
      pruneWindow(reg, win.windowId);
      win = activeWindow(reg);
      continue;
    }
    break;
  }

  if (win) {
    // Growth step: apply the next split from the window's layout recipe.
    const nextCellIndex = win.sessionIds.filter(Boolean).length;
    const op = LAYOUTS[win.layoutId].splits[nextCellIndex - 1];
    if (!op) {
      throw new Error(
        `op: orchestrator expected split for cell ${nextCellIndex} in layout ${win.layoutId}`,
      );
    }
    const parentId = win.sessionIds[op.from];
    if (!parentId) {
      throw new Error(
        `op: orchestrator cannot split missing parent cell ${op.from} in window ${win.windowId}`,
      );
    }

    await ensureAgentWindow({
      args,
      tmuxSession: win.tmuxSession,
      windowName,
    });
    const viewScript = await writeViewScript({
      args,
      tmuxSession: win.tmuxSession,
      tmuxWindow: windowName,
    });

    const sessionId = await splitSession(parentId, op.dir, quoteForBash(viewScript));
    win.sessionIds[nextCellIndex] = sessionId;

    const ref: SurfaceRef = {
      sessionId,
      windowId: win.windowId,
      cellIndex: nextCellIndex,
      layoutId: win.layoutId,
      tmuxWindow: windowName,
    };
    assignSurface(reg, args.issueId, ref);
    await registry.save(reg);

    return {
      scriptPath: viewScript,
      tmuxSession: win.tmuxSession,
      tmuxWindow: windowName,
      windowId: win.windowId,
      sessionId,
      cellIndex: nextCellIndex,
      layoutId: win.layoutId,
    };
  }

  // Overflow or first launch: new tmux session + new iTerm window at layout
  // cell 0.
  const tmuxSession = `${args.baseTmuxSession}-${reg.windowOrder.length + 1}`;

  await ensureAgentWindow({ args, tmuxSession, windowName });
  const viewScript = await writeViewScript({ args, tmuxSession, tmuxWindow: windowName });
  const { windowId, sessionId } = await createWindow(quoteForBash(viewScript));

  const newWin: WindowState = {
    windowId,
    layoutId: ceiling,
    sessionIds: new Array<string | undefined>(spec.cells).fill(undefined),
    tmuxSession,
  };
  newWin.sessionIds[0] = sessionId;
  addWindow(reg, newWin);

  const ref: SurfaceRef = {
    sessionId,
    windowId,
    cellIndex: 0,
    layoutId: ceiling,
    tmuxWindow: windowName,
  };
  assignSurface(reg, args.issueId, ref);
  await registry.save(reg);

  return {
    scriptPath: viewScript,
    tmuxSession,
    tmuxWindow: windowName,
    windowId,
    sessionId,
    cellIndex: 0,
    layoutId: ceiling,
  };
}

interface EnsureArgs {
  args: OrchestrateArgs;
  tmuxSession: string;
  windowName: string;
}

// Create (or reuse) the tmux window that hosts the agent process. The agent
// runs inside the tmux window — iTerm's pane is merely a grouped-session
// viewer — so closing the pane doesn't kill the agent.
async function ensureAgentWindow({ args, tmuxSession, windowName }: EnsureArgs): Promise<void> {
  const innerPath = await writeAgentInnerScript(args);
  const prep = buildPrepScript({
    tmuxBinary: args.tmuxBinary,
    session: tmuxSession,
    windowName,
    innerPath,
  });
  await pExecFile("/bin/bash", ["-c", prep]);
}

interface ViewArgs {
  args: OrchestrateArgs;
  tmuxSession: string;
  tmuxWindow: string;
}

// Per-pane bash script: create a grouped session so this pane can track its
// own current-window independently from other panes attached to the same
// underlying session, then attach and select the agent's window.
async function writeViewScript({ args, tmuxSession, tmuxWindow }: ViewArgs): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "op-view-"));
  const viewPath = path.join(dir, "view.command");
  const tmux = shSingleQuote(args.tmuxBinary);
  const sess = shSingleQuote(tmuxSession);
  const groupSess = shSingleQuote(`view-${args.issueId}`);
  const win = shSingleQuote(tmuxWindow);
  const lines = [
    "#!/bin/bash",
    "set -e",
    `export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$HOME/bin:$PATH"`,
    `${tmux} new-session -d -s ${groupSess} -t ${sess} 2>/dev/null || true`,
    `exec ${tmux} attach -t ${groupSess} \\; select-window -t ${sess}:${win}`,
    "",
  ];
  await fs.writeFile(viewPath, lines.join("\n"), { mode: 0o755 });
  return viewPath;
}

// Agent inner script: same shape as the pre-orchestrator launch path —
// cd + PATH + env + exec binary with prompt (or interactive shell in debug
// mode). Factored here so the tmux window runs it when first created.
async function writeAgentInnerScript(args: OrchestrateArgs): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "op-agent-"));
  const innerPath = path.join(dir, "agent.command");
  const promptPath = path.join(dir, "prompt.txt");
  await fs.writeFile(promptPath, args.prompt, { mode: 0o600 });

  const flagsShell = args.launchFlags.map(shSingleQuote).join(" ");
  const cwdShell = shSingleQuote(args.cwd);
  const binShell = shSingleQuote(args.binary);
  const promptShell = shSingleQuote(promptPath);
  const issueIdShell = shSingleQuote(args.issueId);
  const agentIdShell = shSingleQuote(args.agentId);

  const lines = [
    "#!/bin/bash",
    "set -e",
    `cd ${cwdShell}`,
    `export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$HOME/bin:$PATH"`,
    `export OP_ISSUE_ID=${issueIdShell}`,
    `export OP_AGENT_ID=${agentIdShell}`,
  ];
  if (args.debug) {
    lines.push(
      `echo "[op] debug agent launch — interactive shell (issue=${args.issueId} agent=${args.agentId})"`,
      `echo "[op] would have run: ${args.binary} ${args.launchFlags.join(" ")} <prompt>"`,
      `exec "$SHELL" -l`,
    );
  } else {
    lines.push(`PROMPT=$(<${promptShell})`, `exec ${binShell} ${flagsShell} "$PROMPT"`);
  }
  lines.push("");
  await fs.writeFile(innerPath, lines.join("\n"), { mode: 0o755 });
  return innerPath;
}

function pruneWindow(reg: RegistryData, windowId: string): void {
  delete reg.windows[windowId];
  reg.windowOrder = reg.windowOrder.filter((id) => id !== windowId);
  for (const [issueId, ref] of Object.entries(reg.surfaces)) {
    if (ref.windowId === windowId) delete reg.surfaces[issueId];
  }
}

function shSingleQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

// iTerm's `create window with default profile command "..."` takes a bash
// command line, not a file path — we pass `bash <path>` so the shebang line
// is irrelevant and osascript escaping is uniform.
function quoteForBash(scriptPath: string): string {
  return `bash ${shSingleQuote(scriptPath)}`;
}
