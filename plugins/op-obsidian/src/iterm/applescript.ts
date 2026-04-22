import { execFile } from "child_process";
import { promisify } from "util";

import { LAYOUTS, type LayoutId, type SplitOp } from "../layout/layouts";

const pExecFile = promisify(execFile);

// Thin wrapper around `osascript` for driving iTerm2. We use AppleScript
// rather than iTerm's websocket API so we stay dep-free (no protobuf). The
// tradeoff is no push notifications — we round-trip osascript for every
// operation — which is fine for the orchestrator's batch-create pattern.

export async function runOsa(script: string): Promise<string> {
  const { stdout } = await pExecFile("/usr/bin/osascript", ["-e", script]);
  return stdout.trim();
}

export interface CreateWindowResult {
  windowId: string;
  sessionId: string; // the initial session (cell 0) of the new window
}

// Creates a new iTerm window running `command`, returns window id + cell-0
// session id. `command` is expected to be a bash line (shell-quoted by the
// caller). iTerm's AppleScript returns internal numeric ids for windows and
// UUIDs for sessions.
export async function createWindow(command: string): Promise<CreateWindowResult> {
  const script = [
    'tell application "iTerm2"',
    "  activate",
    `  set _w to (create window with default profile command ${osaQuote(command)})`,
    "  set _s to current session of _w",
    '  return (id of _w as string) & "\\t" & (id of _s as string)',
    "end tell",
  ].join("\n");
  const out = await runOsa(script);
  const [windowId, sessionId] = out.split("\t");
  if (!windowId || !sessionId) {
    throw new Error(`op: iTerm createWindow returned unexpected output: ${JSON.stringify(out)}`);
  }
  return { windowId, sessionId };
}

export async function splitSession(
  sessionId: string,
  dir: "vertical" | "horizontal",
  command: string,
): Promise<string> {
  // Find the session by id, split it in the requested direction, return the
  // new session's id. iTerm2 exposes split commands on a `session` object.
  const splitVerb = dir === "vertical" ? "split vertically" : "split horizontally";
  const script = [
    'tell application "iTerm2"',
    "  set _target to missing value",
    "  repeat with _w in windows",
    "    repeat with _t in tabs of _w",
    "      repeat with _s in sessions of _t",
    `        if (id of _s as string) = ${osaQuote(sessionId)} then set _target to _s`,
    "      end repeat",
    "    end repeat",
    "  end repeat",
    "  if _target is missing value then error \"op: session not found: \" & " + osaQuote(sessionId),
    `  tell _target to set _new to (${splitVerb} with default profile command ${osaQuote(command)})`,
    "  return (id of _new as string)",
    "end tell",
  ].join("\n");
  const out = await runOsa(script);
  if (!out) throw new Error(`op: iTerm splitSession returned empty id (session=${sessionId})`);
  return out;
}

export async function selectSession(sessionId: string): Promise<void> {
  const script = [
    'tell application "iTerm2"',
    "  activate",
    "  repeat with _w in windows",
    "    repeat with _t in tabs of _w",
    "      repeat with _s in sessions of _t",
    `        if (id of _s as string) = ${osaQuote(sessionId)} then`,
    "          select _w",
    "          tell _t to select",
    "          select _s",
    "          return",
    "        end if",
    "      end repeat",
    "    end repeat",
    "  end repeat",
    "end tell",
  ].join("\n");
  await runOsa(script);
}

export async function sessionExists(sessionId: string): Promise<boolean> {
  const script = [
    'tell application "iTerm2"',
    "  repeat with _w in windows",
    "    repeat with _t in tabs of _w",
    "      repeat with _s in sessions of _t",
    `        if (id of _s as string) = ${osaQuote(sessionId)} then return "yes"`,
    "      end repeat",
    "    end repeat",
    "  end repeat",
    '  return "no"',
    "end tell",
  ].join("\n");
  const out = await runOsa(script);
  return out === "yes";
}

// Build a window + layout in one go. Runs create-window for cell 0 with
// `commands[0]`, then applies the layout's split sequence, each new cell
// running its own command. Returns window id and the resolved session id
// per cell index.
export async function buildLayoutWindow(
  layoutId: LayoutId,
  commands: string[],
): Promise<{ windowId: string; sessionIds: string[] }> {
  const spec = LAYOUTS[layoutId];
  if (commands.length !== spec.cells) {
    throw new Error(
      `op: buildLayoutWindow expects ${spec.cells} commands for layout ${layoutId}, got ${commands.length}`,
    );
  }
  const { windowId, sessionId } = await createWindow(commands[0]);
  const sessionIds: string[] = [sessionId];
  for (const op of spec.splits) {
    const parent = sessionIds[op.from];
    if (!parent) {
      throw new Error(`op: layout ${layoutId} references cell ${op.from} before it exists`);
    }
    const newId = await splitSession(parent, op.dir, commands[sessionIds.length]);
    sessionIds.push(newId);
  }
  return { windowId, sessionIds };
}

// Apply a single split on an existing layout, producing one additional cell.
// Used when a window is created with a smaller initial layout and later grows
// to accommodate another agent. Returns the new session id.
export async function applySplit(
  existingCells: string[],
  op: SplitOp,
  command: string,
): Promise<string> {
  const parent = existingCells[op.from];
  if (!parent) throw new Error(`op: applySplit references missing cell ${op.from}`);
  return splitSession(parent, op.dir, command);
}

// AppleScript double-quoted string: escape backslashes and double quotes.
export function osaQuote(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
