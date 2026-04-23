import { describe, expect, it, vi, beforeEach } from "vitest";
import { DEFAULT_SETTINGS } from "../settingsPure";

vi.mock("./applescript", () => ({
  sessionExists: vi.fn(async (_id: string) => true),
  selectSession: vi.fn(async () => undefined),
  createWindow: vi.fn(async () => ({ windowId: "as-w", sessionId: "as-s" })),
  splitSession: vi.fn(async () => "as-split"),
  setSessionName: vi.fn(async () => undefined),
  setWindowName: vi.fn(async () => undefined),
  buildLayoutWindow: vi.fn(async () => ({ windowId: "as-w", sessionIds: ["as-s"] })),
  applySplit: vi.fn(async () => "as-apply"),
}));

vi.mock("./client", () => ({
  sessionExists: vi.fn(async (_id: string) => false),
  selectSession: vi.fn(async () => undefined),
  createWindow: vi.fn(async () => ({ windowId: "ws-w", sessionId: "ws-s" })),
  splitSession: vi.fn(async () => "ws-split"),
  setSessionName: vi.fn(async () => undefined),
  setWindowName: vi.fn(async () => undefined),
  buildLayoutWindow: vi.fn(async () => ({ windowId: "ws-w", sessionIds: ["ws-s"] })),
  applySplit: vi.fn(async () => "ws-apply"),
}));

import * as applescript from "./applescript";
import * as wsClient from "./client";
import * as driver from "./driver";

const asSettings = { ...DEFAULT_SETTINGS, iterm: { useWebSocketClient: false } };
const wsSettings = { ...DEFAULT_SETTINGS, iterm: { useWebSocketClient: true } };

describe("iterm/driver dispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes sessionExists by flag", async () => {
    expect(await driver.sessionExists(asSettings, "a")).toBe(true);
    expect(applescript.sessionExists).toHaveBeenCalledWith("a");
    expect(wsClient.sessionExists).not.toHaveBeenCalled();

    expect(await driver.sessionExists(wsSettings, "b")).toBe(false);
    expect(wsClient.sessionExists).toHaveBeenCalledWith("b");
  });

  it("routes createWindow by flag", async () => {
    expect(await driver.createWindow(asSettings, "cmd")).toEqual({ windowId: "as-w", sessionId: "as-s" });
    expect(applescript.createWindow).toHaveBeenCalledWith("cmd");

    expect(await driver.createWindow(wsSettings, "cmd2")).toEqual({ windowId: "ws-w", sessionId: "ws-s" });
    expect(wsClient.createWindow).toHaveBeenCalledWith("cmd2");
  });

  it("routes splitSession by flag", async () => {
    expect(await driver.splitSession(asSettings, "p", "vertical", "cmd")).toBe("as-split");
    expect(applescript.splitSession).toHaveBeenCalledWith("p", "vertical", "cmd");

    expect(await driver.splitSession(wsSettings, "p", "horizontal", "cmd")).toBe("ws-split");
    expect(wsClient.splitSession).toHaveBeenCalledWith("p", "horizontal", "cmd");
  });

  it("routes setSessionName by flag", async () => {
    await driver.setSessionName(asSettings, "s", "name");
    expect(applescript.setSessionName).toHaveBeenCalledWith("s", "name");

    await driver.setSessionName(wsSettings, "s", "name");
    expect(wsClient.setSessionName).toHaveBeenCalledWith("s", "name");
  });

  it("routes setWindowName by flag", async () => {
    await driver.setWindowName(asSettings, "w", "title");
    expect(applescript.setWindowName).toHaveBeenCalledWith("w", "title");

    await driver.setWindowName(wsSettings, "w", "title");
    expect(wsClient.setWindowName).toHaveBeenCalledWith("w", "title");
  });

  it("routes selectSession by flag", async () => {
    await driver.selectSession(asSettings, "s");
    expect(applescript.selectSession).toHaveBeenCalledWith("s");

    await driver.selectSession(wsSettings, "s");
    expect(wsClient.selectSession).toHaveBeenCalledWith("s");
  });

  it("routes buildLayoutWindow by flag", async () => {
    await driver.buildLayoutWindow(asSettings, "1x1", ["a"]);
    expect(applescript.buildLayoutWindow).toHaveBeenCalledWith("1x1", ["a"]);

    await driver.buildLayoutWindow(wsSettings, "1x1", ["a"]);
    expect(wsClient.buildLayoutWindow).toHaveBeenCalledWith("1x1", ["a"]);
  });

  it("routes applySplit by flag", async () => {
    const op = { from: 0, dir: "vertical" as const };
    await driver.applySplit(asSettings, ["c0"], op, "cmd");
    expect(applescript.applySplit).toHaveBeenCalledWith(["c0"], op, "cmd");

    await driver.applySplit(wsSettings, ["c0"], op, "cmd");
    expect(wsClient.applySplit).toHaveBeenCalledWith(["c0"], op, "cmd");
  });
});
