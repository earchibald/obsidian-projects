import type { LayoutId, SplitOp } from "../layout/layouts";
import type { OpSettings } from "../settingsPure";
import * as applescript from "./applescript";
import * as wsClient from "./client";

// Routing layer for the iTerm driver. Picks between the legacy AppleScript
// implementation (default) and the WebSocket client based on the
// `iterm.useWebSocketClient` setting.
//
// OP-101 Step 3: every op now has a WS port. The flag still defaults off so
// AppleScript is the live path; Step 4 flips the default.

export interface CreateWindowResult {
  windowId: string;
  sessionId: string;
}

function useWs(settings: OpSettings): boolean {
  return settings.iterm?.useWebSocketClient === true;
}

export async function sessionExists(settings: OpSettings, sessionId: string): Promise<boolean> {
  if (useWs(settings)) return wsClient.sessionExists(sessionId);
  return applescript.sessionExists(sessionId);
}

export async function createWindow(
  settings: OpSettings,
  command: string,
): Promise<CreateWindowResult> {
  if (useWs(settings)) return wsClient.createWindow(command);
  return applescript.createWindow(command);
}

export async function splitSession(
  settings: OpSettings,
  sessionId: string,
  dir: "vertical" | "horizontal",
  command: string,
): Promise<string> {
  if (useWs(settings)) return wsClient.splitSession(sessionId, dir, command);
  return applescript.splitSession(sessionId, dir, command);
}

export async function setSessionName(
  settings: OpSettings,
  sessionId: string,
  name: string,
): Promise<void> {
  if (useWs(settings)) return wsClient.setSessionName(sessionId, name);
  return applescript.setSessionName(sessionId, name);
}

export async function setWindowName(
  settings: OpSettings,
  windowId: string,
  name: string,
): Promise<void> {
  if (useWs(settings)) return wsClient.setWindowName(windowId, name);
  return applescript.setWindowName(windowId, name);
}

export async function selectSession(settings: OpSettings, sessionId: string): Promise<void> {
  if (useWs(settings)) return wsClient.selectSession(sessionId);
  return applescript.selectSession(sessionId);
}

export async function buildLayoutWindow(
  settings: OpSettings,
  layoutId: LayoutId,
  commands: string[],
): Promise<{ windowId: string; sessionIds: string[] }> {
  if (useWs(settings)) return wsClient.buildLayoutWindow(layoutId, commands);
  return applescript.buildLayoutWindow(layoutId, commands);
}

export async function applySplit(
  settings: OpSettings,
  existingCells: string[],
  op: SplitOp,
  command: string,
): Promise<string> {
  if (useWs(settings)) return wsClient.applySplit(existingCells, op, command);
  return applescript.applySplit(existingCells, op, command);
}
