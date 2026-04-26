import { execFile } from "child_process";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { promisify } from "util";

import { LAYOUTS, type LayoutId } from "./layout/layouts";
import type { RegistryData, SurfaceRef, WindowState } from "./layout/registry";
import { activeWindow, addWindow, assignSurface } from "./layout/registry";
import type { OpSettings } from "./settingsPure";
import {
  createWindow,
  selectSession,
  sessionExists,
  setSessionName,
  setWindowName,
  splitSession,
} from "./iterm/driver";
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
  // Human-readable title used for the iTerm session/pane title (and the
  // one-shot OSC 2 in the view script). Typically the issue note's file
  // basename (e.g. "OP-94 iterm window title shows …"). Falls back to
  // issueId when empty.
  issueTitle?: string;
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
  // OP-155 §4 Step 1: when true, do not bring iTerm to the foreground.
  // `open -ga iTerm` is run first so the WS connect succeeds, and the
  // `createWindow` call is issued with `activate: false`. The split path
  // (growth into an existing window) does not need additional treatment —
  // `splitSession` does not call ActivateRequest in the first place.
  backgroundLaunch?: boolean;
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
  opSettings: OpSettings,
  registry: RegistryIO,
): Promise<OrchestrateResult> {
  const settings = opSettings.orchestrator;
  const reg = registry.get();

  // Re-launching an existing issue: if the session still exists in iTerm,
  // just select it. Otherwise fall through to fresh assignment — the user
  // likely closed the pane, and the issueId → session mapping is stale.
  const sessionTitle = args.issueTitle && args.issueTitle.length > 0 ? args.issueTitle : args.issueId;
  const existing = reg.surfaces[args.issueId];
  if (existing && (await sessionExists(existing.sessionId))) {
    await selectSession(existing.sessionId);
    await setSessionName(existing.sessionId, sessionTitle);
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
  // in iTerm. Closing a single agent pane invalidates only that cell's
  // session; other panes in the same iTerm window keep running. Probe every
  // tracked session, clear dead slots so they can be reused, and only
  // discard the whole window when every cell is gone.
  let win = activeWindow(reg);
  while (win) {
    const anyAlive = await pruneDeadSessionSlots(reg, win, (sid) =>
      sessionExists(sid),
    );
    if (!anyAlive) {
      pruneWindow(reg, win.windowId);
      win = activeWindow(reg);
      continue;
    }
    if (win.sessionIds.filter(Boolean).length >= LAYOUTS[win.layoutId].cells) {
      win = undefined;
    }
    break;
  }

  if (win) {
    // Growth step: fill the first empty slot in the window's layout. After
    // pruning dead cells the slot array can be sparse, so pick the lowest
    // empty index rather than counting filled slots.
    const cellCount = LAYOUTS[win.layoutId].cells;
    const nextCellIndex = firstEmptyCell(win.sessionIds, cellCount);
    if (nextCellIndex === -1) {
      throw new Error(
        `op: orchestrator found no empty cell in window ${win.windowId} (layout ${win.layoutId})`,
      );
    }
    const op = LAYOUTS[win.layoutId].splits[nextCellIndex - 1];
    if (!op) {
      throw new Error(
        `op: orchestrator expected split for cell ${nextCellIndex} in layout ${win.layoutId}`,
      );
    }
    // If the layout's prescribed parent cell was the one the user closed,
    // fall back to any live cell. iTerm already reflowed the window when
    // the pane closed, so the spec's geometry is approximate at this point.
    const parentId =
      win.sessionIds[op.from] ??
      win.sessionIds.find((s): s is string => typeof s === "string");
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
    await setSessionName(sessionId, sessionTitle);
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
  // OP-155 §4 Step 1: cold-start iTerm in the background and skip the WS
  // ActivateRequest when `backgroundLaunch` is on.
  if (args.backgroundLaunch) {
    await pExecFile("/usr/bin/open", ["-ga", "iTerm"]);
  }
  const { windowId, sessionId } = await createWindow(quoteForBash(viewScript), {
    activate: !args.backgroundLaunch,
  });
  await setWindowName(windowId, tmuxSession);
  await setSessionName(sessionId, sessionTitle);

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
  const script = buildViewScript({
    tmuxBinary: args.tmuxBinary,
    tmuxSession,
    tmuxWindow,
    issueId: args.issueId,
    issueTitle: args.issueTitle,
  });
  await fs.writeFile(viewPath, script, { mode: 0o755 });
  return viewPath;
}

interface BuildViewArgs {
  tmuxBinary: string;
  tmuxSession: string;
  tmuxWindow: string;
  issueId: string;
  issueTitle?: string;
}

// OP-172: emit BOTH OSC 1 (icon/tab name = issue id) and OSC 2 (window title =
// issue title) before `exec tmux attach`. Without OSC 1 the iTerm session-name
// slot was being auto-set to the running command name ("tmux"), so every pane
// label read "tmux" — `setSessionName` lands on iTerm's profile-name slot,
// which is a different field from what the tab label tracks. OSC 1 pins the
// tab label to `<issueId>` per-pane; tmux without `set-titles on` does not
// re-emit OSC 1/2 across pane focus changes, so this stays sticky and avoids
// the OP-103 regression where a focused pane's id leaked to the window title.
export function buildViewScript({
  tmuxBinary,
  tmuxSession,
  tmuxWindow,
  issueId,
  issueTitle,
}: BuildViewArgs): string {
  const tmux = shSingleQuote(tmuxBinary);
  const groupSessName = `view-${issueId}`;
  const sess = shSingleQuote(tmuxSession);
  const groupSess = shSingleQuote(groupSessName);
  const groupSessTarget = shSingleQuote(`=${groupSessName}`);
  const win = shSingleQuote(tmuxWindow);
  const tabName = shSingleQuote(oscSafe(issueId));
  const windowTitle = shSingleQuote(
    oscSafe(issueTitle && issueTitle.length > 0 ? issueTitle : issueId),
  );
  // OP-178: the per-pane grouped session shares its window list with the
  // parent op-agents-N session. When the agent's window is unlinked (e.g. on
  // /quit) tmux silently switches the attached client to the next window —
  // typically a sibling agent — so the iTerm pane lingers as a duplicate
  // viewer. The hook below kills the view session when the unlinked window
  // is *this* pane's agent window; tmux then detaches the client, the bash
  // `exec tmux attach` returns, and the iTerm pane closes.
  const hookCmd = `if-shell -F '#{==:#{hook_window_name},${tmuxWindow}}' 'kill-session -t =${groupSessName}'`;
  const lines = [
    "#!/bin/bash",
    "set -e",
    `export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$HOME/bin:$PATH"`,
    `${tmux} new-session -d -s ${groupSess} -t ${sess} 2>/dev/null || true`,
    // OP-178: make set-hook non-fatal so a session-already-gone race (agent
    // crashed before this script reached set-hook) doesn't show an error
    // before the subsequent exec-attach also fails and the pane closes.
    `${tmux} set-hook -t ${groupSessTarget} window-unlinked ${shSingleQuote(hookCmd)} 2>/dev/null || true`,
    // OP-178 race guard: if the agent window died between new-session and
    // set-hook while sibling windows kept the session alive, the hook is now
    // installed but will never fire (window already gone). Kill the session
    // immediately so exec-attach never runs and the pane closes cleanly.
    `${tmux} select-window -t ${groupSessTarget}:${win} 2>/dev/null || { ${tmux} kill-session -t ${groupSessTarget} 2>/dev/null || true; }`,
    `printf '\\033]1;%s\\007' ${tabName}`,
    `printf '\\033]2;%s\\007' ${windowTitle}`,
    `exec ${tmux} attach -t ${groupSess} \\; select-window -t ${groupSess}:${win}`,
    "",
  ];
  return lines.join("\n");
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

// Probe each tracked session in a window. Clear slots whose iTerm session
// is gone (and drop any surface ref that pointed at it) so the freed cell
// can host a new agent. Alive sessions are compacted to the front of the
// slot array so that sessionIds[0..k-1] is the live prefix — this keeps
// the layout's split spec addressable (splits[i] describes how cell i+1
// derives from an earlier cell, so gaps at the root break the next split
// lookup). Surface refs are rewritten to match the new cellIndex since
// the mapping is identified by sessionId, not physical position. Returns
// whether the window still has at least one live cell.
export async function pruneDeadSessionSlots(
  reg: RegistryData,
  win: WindowState,
  exists: (sessionId: string) => Promise<boolean>,
): Promise<boolean> {
  const alive: string[] = [];
  for (let i = 0; i < win.sessionIds.length; i++) {
    const sid = win.sessionIds[i];
    if (!sid) continue;
    if (await exists(sid)) {
      alive.push(sid);
    } else {
      for (const [issueId, ref] of Object.entries(reg.surfaces)) {
        if (ref.sessionId === sid) delete reg.surfaces[issueId];
      }
    }
  }
  for (let i = 0; i < win.sessionIds.length; i++) {
    win.sessionIds[i] = i < alive.length ? alive[i] : undefined;
  }
  for (const ref of Object.values(reg.surfaces)) {
    if (ref.windowId !== win.windowId) continue;
    const idx = alive.indexOf(ref.sessionId);
    if (idx !== -1) ref.cellIndex = idx;
  }
  return alive.length > 0;
}

export function firstEmptyCell(
  sessionIds: (string | undefined)[],
  cellCount: number,
): number {
  for (let i = 0; i < cellCount; i++) {
    if (!sessionIds[i]) return i;
  }
  return -1;
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

// Strip ASCII C0/C1 control characters so that injected ESC (\x1b) or BEL
// (\x07) in untrusted strings (frontmatter id/title) cannot prematurely
// terminate or inject into an OSC sequence payload.
function oscSafe(s: string): string {
  return s.replace(/[\x00-\x1f\x7f]/g, "");
}

// iTerm's `create window with default profile command "..."` takes a bash
// command line, not a file path — we pass `bash <path>` so the shebang line
// is irrelevant and osascript escaping is uniform.
function quoteForBash(scriptPath: string): string {
  return `bash ${shSingleQuote(scriptPath)}`;
}
