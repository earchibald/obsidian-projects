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

export async function createWindow(command: string): Promise<CreateWindowResult> {
  return wsClient.createWindow(command);
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
