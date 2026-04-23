import type { LayoutId, SplitOp } from "../layout/layouts";
import type { OpSettings } from "../settingsPure";
import * as applescript from "./applescript";
import * as wsClient from "./client";

// Routing layer for the iTerm driver. Picks between the legacy AppleScript
// implementation (default) and the WebSocket client based on the
// `iterm.useWebSocketClient` setting.
//
// OP-101 Step 2: only sessionExists has a working WS port. The other ops keep
// using AppleScript even when the flag is on, so flipping the toggle in dev
// stays safe to smoke-test.

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

// The remaining ops have no WS implementation yet; they always go through
// AppleScript regardless of the flag. The driver still exists so callers can
// migrate their imports now and Step 3 only has to flip the dispatch.

export async function createWindow(_settings: OpSettings, command: string): Promise<CreateWindowResult> {
  return applescript.createWindow(command);
}

export async function splitSession(
  _settings: OpSettings,
  sessionId: string,
  dir: "vertical" | "horizontal",
  command: string,
): Promise<string> {
  return applescript.splitSession(sessionId, dir, command);
}

export async function setSessionName(
  _settings: OpSettings,
  sessionId: string,
  name: string,
): Promise<void> {
  return applescript.setSessionName(sessionId, name);
}

export async function setWindowName(
  _settings: OpSettings,
  windowId: string,
  name: string,
): Promise<void> {
  return applescript.setWindowName(windowId, name);
}

export async function selectSession(_settings: OpSettings, sessionId: string): Promise<void> {
  return applescript.selectSession(sessionId);
}

export async function buildLayoutWindow(
  _settings: OpSettings,
  layoutId: LayoutId,
  commands: string[],
): Promise<{ windowId: string; sessionIds: string[] }> {
  return applescript.buildLayoutWindow(layoutId, commands);
}

export async function applySplit(
  _settings: OpSettings,
  existingCells: string[],
  op: SplitOp,
  command: string,
): Promise<string> {
  return applescript.applySplit(existingCells, op, command);
}
