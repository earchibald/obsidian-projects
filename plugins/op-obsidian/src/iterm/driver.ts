import type { LayoutId, SplitOp } from "../layout/layouts";
import * as wsClient from "./client";

// Thin re-export layer for the iTerm driver. OP-101 Step 2–4 routed calls
// through a flag that switched between the AppleScript driver and the
// WebSocket client; Step 5 deleted the AppleScript path and the flag, so this
// module is now a pass-through kept only so call sites don't all import
// `./client` directly.

export interface CreateWindowResult {
  windowId: string;
  sessionId: string;
}

export async function sessionExists(sessionId: string): Promise<boolean> {
  return wsClient.sessionExists(sessionId);
}

export async function closeWindow(windowId: string): Promise<void> {
  return wsClient.closeWindow(windowId);
}

export async function createWindow(
  command: string,
  opts: { activate?: boolean } = {},
): Promise<CreateWindowResult> {
  return wsClient.createWindow(command, opts);
}

export async function createTab(
  command: string,
  windowId: string,
  opts: { activate?: boolean } = {},
): Promise<CreateWindowResult> {
  return wsClient.createTab(command, windowId, opts);
}

export async function activeWindowId(): Promise<string | undefined> {
  return wsClient.activeWindowId();
}

export async function splitSession(
  sessionId: string,
  dir: "vertical" | "horizontal",
  command: string,
): Promise<string> {
  return wsClient.splitSession(sessionId, dir, command);
}

export async function setSessionName(sessionId: string, name: string): Promise<void> {
  return wsClient.setSessionName(sessionId, name);
}

export async function setWindowName(windowId: string, name: string): Promise<void> {
  return wsClient.setWindowName(windowId, name);
}

export async function selectSession(sessionId: string): Promise<void> {
  return wsClient.selectSession(sessionId);
}

export async function buildLayoutWindow(
  layoutId: LayoutId,
  commands: string[],
): Promise<{ windowId: string; sessionIds: string[] }> {
  return wsClient.buildLayoutWindow(layoutId, commands);
}

export async function applySplit(
  existingCells: string[],
  op: SplitOp,
  command: string,
): Promise<string> {
  return wsClient.applySplit(existingCells, op, command);
}

// OP-232: best-effort "open <url> in an iTerm browser tab". Re-exported
// here so call sites stay on the driver surface rather than importing
// `./client` directly.
export type { OpenBrowserTabResult } from "./client";
export async function openBrowserTab(url: string): Promise<wsClient.OpenBrowserTabResult> {
  return wsClient.openBrowserTab(url);
}
