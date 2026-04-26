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

// `activate` (default true) controls whether iTerm is brought to the
// foreground before the create call — mirroring the legacy AppleScript path's
// `activate`-then-`create window` pair. Background-launch mode (OP-155 Step 1)
// passes `activate: false` so a launch from inside Obsidian doesn't steal
// focus; the caller is expected to have already ensured iTerm is running
// (e.g. via `open -ga iTerm`) so the WS connection succeeds.
export async function createWindow(
  command: string,
  opts: { activate?: boolean } = {},
): Promise<CreateWindowResult> {
  if (opts.activate !== false) await activateITerm();

  const reply = await call({
    createTabRequest: iterm2.CreateTabRequest.create({
      customProfileProperties: customCommandProperties(command),
    }),
  });
  return parseCreateTabResponse(reply, "createWindow");
}

// Add a tab to an existing iTerm window. Mirrors the AppleScript path's
// `tell current window to create tab with default profile command …`. See
// `createWindow` for the `activate` flag semantics.
export async function createTab(
  command: string,
  windowId: string,
  opts: { activate?: boolean } = {},
): Promise<CreateWindowResult> {
  if (opts.activate !== false) await activateITerm();

  const reply = await call({
    createTabRequest: iterm2.CreateTabRequest.create({
      windowId,
      customProfileProperties: customCommandProperties(command),
    }),
  });
  return parseCreateTabResponse(reply, `createTab(window=${windowId})`);
}

async function activateITerm(): Promise<void> {
  await call({
    activateRequest: iterm2.ActivateRequest.create({
      activateApp: iterm2.ActivateRequest.App.create({
        raiseAllWindows: true,
        ignoringOtherApps: true,
      }),
    }),
  });
}

function parseCreateTabResponse(
  reply: iterm2.ServerOriginatedMessage,
  context: string,
): CreateWindowResult {
  const sub = reply.createTabResponse;
  if (!sub) throw new Error(`op: iTerm ${context}: missing createTabResponse`);
  if (sub.status !== undefined && sub.status !== iterm2.CreateTabResponse.Status.OK) {
    throw new Error(`op: iTerm ${context} failed with status=${sub.status}`);
  }
  if (!sub.windowId || !sub.sessionId) {
    throw new Error(`op: iTerm ${context} reply missing window_id or session_id`);
  }
  return { windowId: sub.windowId, sessionId: sub.sessionId };
}

// Returns the windowId of the iTerm window that is currently key (frontmost),
// or undefined when no iTerm window is key (iTerm not frontmost, all windows
// minimized, or iTerm has no windows). Mimics AppleScript `tell application
// "iTerm" to current window`. iTerm's Python API uses the same FocusRequest
// path inside `App.current_terminal_window`.
export async function activeWindowId(): Promise<string | undefined> {
  const reply = await call({ focusRequest: iterm2.FocusRequest.create({}) });
  const fr = reply.focusResponse;
  if (!fr) throw new Error("op: iTerm activeWindowId: missing focusResponse");
  for (const note of fr.notifications ?? []) {
    const w = note.window;
    if (
      w &&
      w.windowStatus ===
        iterm2.FocusChangedNotification.Window.WindowStatus.TERMINAL_WINDOW_BECAME_KEY &&
      w.windowId
    ) {
      return w.windowId;
    }
  }
  return undefined;
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

// Close an iTerm window by id. force=true bypasses the "process still running"
// confirmation iTerm normally shows — needed because the window's PTYs are
// still attached to the dead view scripts. NOT_FOUND is treated as success
// (the window is already gone, which is the intended end state).
// USER_DECLINED should not occur with force=true, but some iTerm builds or
// misconfigured prefs may ignore the force flag. We treat USER_DECLINED as
// non-fatal rather than surfacing a warning on every cleanup in those
// environments — the window stays open, the registry still drops it, and the
// next agent launch will allocate a fresh surface.
export async function closeWindow(windowId: string): Promise<void> {
  const reply = await call({
    closeRequest: iterm2.CloseRequest.create({
      windows: iterm2.CloseRequest.CloseWindows.create({ windowIds: [windowId] }),
      force: true,
    }),
  });
  const sub = reply.closeResponse;
  if (!sub) throw new Error("op: iTerm closeWindow: missing closeResponse");
  for (const status of sub.statuses ?? []) {
    if (
      status !== iterm2.CloseResponse.Status.OK &&
      status !== iterm2.CloseResponse.Status.NOT_FOUND &&
      status !== iterm2.CloseResponse.Status.USER_DECLINED
    ) {
      throw new Error(`op: iTerm closeWindow(${windowId}) failed with status=${status}`);
    }
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
