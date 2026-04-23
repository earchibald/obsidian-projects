import type { LayoutId, SplitOp } from "../layout/layouts";
import { iterm2 } from "./proto/api.generated";
import { getTransport, type ConnectionOptions } from "./connection";

// Native TS WebSocket client for iTerm2's API, replacement for applescript.ts.
//
// OP-101 Step 2: sessionExists is wired through the WebSocket transport. The
// remaining write ops still throw notImplemented; they land in Step 3.

export interface CreateWindowResult {
  windowId: string;
  sessionId: string;
}

// Caller wires the version (and optional ws factory for tests) at startup.
let connectionOpts: ConnectionOptions | null = null;

export function configureClient(opts: ConnectionOptions): void {
  connectionOpts = opts;
}

function ensureConfigured(): ConnectionOptions {
  if (!connectionOpts) {
    throw new Error(
      "op: ITerm WebSocket client not configured — configureClient() must be called before use",
    );
  }
  return connectionOpts;
}

function notImplemented(fn: string): never {
  throw new Error(
    `op: ITerm WebSocket client.${fn} is not wired yet (OP-101 Step 2 ports sessionExists only). Flip useWebSocketClient=false or wait for Step 3.`,
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

export async function sessionExists(sessionId: string): Promise<boolean> {
  const transport = await getTransport(ensureConfigured());
  const reply = await transport.request({
    listSessionsRequest: iterm2.ListSessionsRequest.create({}),
  });
  const list = reply.listSessionsResponse;
  if (!list) {
    throw new Error("op: ITerm sessionExists: server reply missing listSessionsResponse");
  }
  return findSessionId(list, sessionId);
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

// Exported for unit tests.
export function findSessionId(
  reply: iterm2.IListSessionsResponse,
  sessionId: string,
): boolean {
  for (const window of reply.windows ?? []) {
    for (const tab of window.tabs ?? []) {
      if (tab.root && walkSplitTree(tab.root, sessionId)) return true;
      for (const minimized of tab.minimizedSessions ?? []) {
        if (minimized.uniqueIdentifier === sessionId) return true;
      }
    }
  }
  for (const buried of reply.buriedSessions ?? []) {
    if (buried.uniqueIdentifier === sessionId) return true;
  }
  return false;
}

function walkSplitTree(node: iterm2.ISplitTreeNode, sessionId: string): boolean {
  for (const link of node.links ?? []) {
    if (link.session && link.session.uniqueIdentifier === sessionId) return true;
    if (link.node && walkSplitTree(link.node, sessionId)) return true;
  }
  return false;
}
