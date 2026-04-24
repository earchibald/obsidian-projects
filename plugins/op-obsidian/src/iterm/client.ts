import { LAYOUTS, type LayoutId, type SplitOp } from "../layout/layouts";
import { iterm2 } from "./proto/api.generated";
import { getTransport, type ConnectionOptions } from "./connection";

// Native TS WebSocket client for iTerm2's API. This is the only iTerm driver
// — the legacy AppleScript path was removed in OP-101 Step 5. The one
// remaining osascript call lives in `cookie.ts` for first-run auth.

export interface CreateWindowResult {
  windowId: string;
  sessionId: string;
}

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

async function call(
  msg: iterm2.IClientOriginatedMessage,
): Promise<iterm2.ServerOriginatedMessage> {
  const transport = await getTransport(ensureConfigured());
  const reply = await transport.request(msg);
  if (reply.submessage === "error") {
    throw new Error(`op: iTerm API error: ${reply.error ?? "<unset>"}`);
  }
  return reply;
}

// iTerm accepts a JSON string literal inside invocation expressions, so
// JSON.stringify is the right escape for a single string argument.
function invocation(method: string, argName: string, value: string): string {
  return `${method}(${argName}: ${JSON.stringify(value)})`;
}

// Profile overrides needed to actually run `command` on session startup
// instead of the profile's default login shell. iTerm's profile has two
// related keys: `Command` holds the command, and `Custom Command` is the
// "Yes"/"No" string flag that gates whether `Command` is used at all. If you
// only set `Command`, iTerm silently runs the default shell — you get a
// window but nothing executes. Setting both makes the override take effect.
function customCommandProperties(command: string): iterm2.ProfileProperty[] {
  return [
    iterm2.ProfileProperty.create({
      key: "Custom Command",
      jsonValue: JSON.stringify("Yes"),
    }),
    iterm2.ProfileProperty.create({
      key: "Command",
      jsonValue: JSON.stringify(command),
    }),
  ];
}

export async function createWindow(command: string): Promise<CreateWindowResult> {
  // Raise iTerm first so the new window is visible when it appears. The
  // legacy AppleScript did `activate` before `create window`.
  await call({
    activateRequest: iterm2.ActivateRequest.create({
      activateApp: iterm2.ActivateRequest.App.create({
        raiseAllWindows: true,
        ignoringOtherApps: true,
      }),
    }),
  });

  const reply = await call({
    createTabRequest: iterm2.CreateTabRequest.create({
      customProfileProperties: customCommandProperties(command),
    }),
  });
  const sub = reply.createTabResponse;
  if (!sub) throw new Error("op: iTerm createWindow: missing createTabResponse");
  if (sub.status !== undefined && sub.status !== iterm2.CreateTabResponse.Status.OK) {
    throw new Error(`op: iTerm createWindow failed with status=${sub.status}`);
  }
  if (!sub.windowId || !sub.sessionId) {
    throw new Error("op: iTerm createWindow reply missing window_id or session_id");
  }
  return { windowId: sub.windowId, sessionId: sub.sessionId };
}

export async function splitSession(
  sessionId: string,
  dir: "vertical" | "horizontal",
  command: string,
): Promise<string> {
  const reply = await call({
    splitPaneRequest: iterm2.SplitPaneRequest.create({
      session: sessionId,
      splitDirection:
        dir === "vertical"
          ? iterm2.SplitPaneRequest.SplitDirection.VERTICAL
          : iterm2.SplitPaneRequest.SplitDirection.HORIZONTAL,
      customProfileProperties: customCommandProperties(command),
    }),
  });
  const sub = reply.splitPaneResponse;
  if (!sub) throw new Error("op: iTerm splitSession: missing splitPaneResponse");
  if (sub.status !== undefined && sub.status !== iterm2.SplitPaneResponse.Status.OK) {
    throw new Error(
      `op: iTerm splitSession failed (session=${sessionId}) with status=${sub.status}`,
    );
  }
  const newId = sub.sessionId?.[0];
  if (!newId) {
    throw new Error(`op: iTerm splitSession reply had no session_id (session=${sessionId})`);
  }
  return newId;
}

// iTerm's session name drives the tab/pane title. The proto documents
// `session.set_name(name: String)` as a builtin *method* (not a registered
// function), so the correct InvokeFunctionRequest context is
// `Method { receiver: <session_id> }` and the invocation is the bare
// `iterm2.set_name(name: …)` — this is what the Python library's
// `async_invoke_method` wire path sends. The earlier `Session {}` context
// targeted the session-scoped *registered-function* table instead, which
// errors with "No function registered" even on installs where the scripting
// runtime is present.
export async function setSessionName(sessionId: string, name: string): Promise<void> {
  const reply = await call({
    invokeFunctionRequest: iterm2.InvokeFunctionRequest.create({
      method: iterm2.InvokeFunctionRequest.Method.create({ receiver: sessionId }),
      invocation: invocation("iterm2.set_name", "name", name),
    }),
  });
  throwInvokeError(reply.invokeFunctionResponse, `setSessionName(${sessionId})`);
}

// Best-effort — iTerm's window title has historically been read-only under
// some builds. Use the `Method` context (same reason as setSessionName above).
// Mirror the AppleScript behaviour: attempt, swallow on error.
export async function setWindowName(windowId: string, name: string): Promise<void> {
  try {
    const reply = await call({
      invokeFunctionRequest: iterm2.InvokeFunctionRequest.create({
        method: iterm2.InvokeFunctionRequest.Method.create({ receiver: windowId }),
        invocation: invocation("iterm2.set_title", "title", name),
      }),
    });
    throwInvokeError(reply.invokeFunctionResponse, `setWindowName(${windowId})`);
  } catch (err) {
    console.warn(
      `[op-obsidian] setWindowName best-effort failed (window=${windowId} name=${JSON.stringify(name)}): ${
        err instanceof Error ? err.message.split("\n")[0] : String(err)
      }`,
    );
  }
}

export async function selectSession(sessionId: string): Promise<void> {
  const reply = await call({
    activateRequest: iterm2.ActivateRequest.create({
      sessionId,
      selectSession: true,
      selectTab: true,
      orderWindowFront: true,
      activateApp: iterm2.ActivateRequest.App.create({
        raiseAllWindows: true,
        ignoringOtherApps: true,
      }),
    }),
  });
  const sub = reply.activateResponse;
  if (!sub) throw new Error("op: iTerm selectSession: missing activateResponse");
  if (sub.status !== undefined && sub.status !== iterm2.ActivateResponse.Status.OK) {
    throw new Error(
      `op: iTerm selectSession failed (session=${sessionId}) with status=${sub.status}`,
    );
  }
}

export async function sessionExists(sessionId: string): Promise<boolean> {
  const reply = await call({
    listSessionsRequest: iterm2.ListSessionsRequest.create({}),
  });
  const list = reply.listSessionsResponse;
  if (!list) {
    throw new Error("op: ITerm sessionExists: server reply missing listSessionsResponse");
  }
  return findSessionId(list, sessionId);
}

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

export async function applySplit(
  existingCells: string[],
  op: SplitOp,
  command: string,
): Promise<string> {
  const parent = existingCells[op.from];
  if (!parent) throw new Error(`op: applySplit references missing cell ${op.from}`);
  return splitSession(parent, op.dir, command);
}

function throwInvokeError(
  resp: iterm2.IInvokeFunctionResponse | null | undefined,
  context: string,
): void {
  if (!resp) throw new Error(`op: iTerm ${context}: missing invokeFunctionResponse`);
  if (resp.error) {
    throw new Error(
      `op: iTerm ${context} failed: ${resp.error.errorReason ?? "<no reason>"} (status=${resp.error.status ?? "?"})`,
    );
  }
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
