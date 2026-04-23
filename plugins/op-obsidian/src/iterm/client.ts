import type { LayoutId, SplitOp } from "../layout/layouts";

// Native TS WebSocket client for iTerm2's API, replacement for applescript.ts.
//
// OP-101 Step 1: dead-code scaffold. Exports the same signatures as
// applescript.ts so later tranches can flip callers over without touching
// their call-sites. All methods throw until Step 2 ports them.

export interface CreateWindowResult {
  windowId: string;
  sessionId: string;
}

function notImplemented(fn: string): never {
  throw new Error(
    `op: ITerm WebSocket client.${fn} is not wired yet (OP-101 Step 1). Flip useWebSocketClient=false or wait for Step 2.`,
  );
}

export async function createWindow(_command: string): Promise<CreateWindowResult> {
  notImplemented("createWindow");
}

export async function splitSession(
  _sessionId: string,
  _dir: "vertical" | "horizontal",
  _command: string,
): Promise<string> {
  notImplemented("splitSession");
}

export async function setSessionName(_sessionId: string, _name: string): Promise<void> {
  notImplemented("setSessionName");
}

export async function setWindowName(_windowId: string, _name: string): Promise<void> {
  notImplemented("setWindowName");
}

export async function selectSession(_sessionId: string): Promise<void> {
  notImplemented("selectSession");
}

export async function sessionExists(_sessionId: string): Promise<boolean> {
  notImplemented("sessionExists");
}

export async function buildLayoutWindow(
  _layoutId: LayoutId,
  _commands: string[],
): Promise<{ windowId: string; sessionIds: string[] }> {
  notImplemented("buildLayoutWindow");
}

export async function applySplit(
  _existingCells: string[],
  _op: SplitOp,
  _command: string,
): Promise<string> {
  notImplemented("applySplit");
}
