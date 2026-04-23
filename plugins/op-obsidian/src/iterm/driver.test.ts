import { describe, expect, it, vi, beforeEach } from "vitest";
import { DEFAULT_SETTINGS } from "../settingsPure";

vi.mock("./applescript", () => ({
  sessionExists: vi.fn(async (_id: string) => true),
  selectSession: vi.fn(async () => undefined),
  createWindow: vi.fn(),
  splitSession: vi.fn(),
  setSessionName: vi.fn(),
  setWindowName: vi.fn(),
  buildLayoutWindow: vi.fn(),
  applySplit: vi.fn(),
}));

vi.mock("./client", () => ({
  sessionExists: vi.fn(async (_id: string) => false),
}));

import * as applescript from "./applescript";
import * as wsClient from "./client";
import { sessionExists } from "./driver";

describe("iterm/driver.sessionExists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses AppleScript when useWebSocketClient is false", async () => {
    const settings = { ...DEFAULT_SETTINGS, iterm: { useWebSocketClient: false } };
    const result = await sessionExists(settings, "abc");
    expect(result).toBe(true);
    expect(applescript.sessionExists).toHaveBeenCalledWith("abc");
    expect(wsClient.sessionExists).not.toHaveBeenCalled();
  });

  it("uses the WebSocket client when useWebSocketClient is true", async () => {
    const settings = { ...DEFAULT_SETTINGS, iterm: { useWebSocketClient: true } };
    const result = await sessionExists(settings, "xyz");
    expect(result).toBe(false);
    expect(wsClient.sessionExists).toHaveBeenCalledWith("xyz");
    expect(applescript.sessionExists).not.toHaveBeenCalled();
  });
});
