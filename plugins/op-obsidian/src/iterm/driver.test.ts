import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./client", () => ({
  sessionExists: vi.fn(async (_id: string) => false),
  selectSession: vi.fn(async () => undefined),
  createWindow: vi.fn(async () => ({ windowId: "ws-w", sessionId: "ws-s" })),
  createTab: vi.fn(async () => ({ windowId: "ws-w", sessionId: "ws-s" })),
  splitSession: vi.fn(async () => "ws-split"),
  setSessionName: vi.fn(async () => undefined),
  setWindowName: vi.fn(async () => undefined),
  buildLayoutWindow: vi.fn(async () => ({ windowId: "ws-w", sessionIds: ["ws-s"] })),
  applySplit: vi.fn(async () => "ws-apply"),
  activeWindowId: vi.fn(async () => undefined),
  closeWindow: vi.fn(async () => undefined),
}));

import * as wsClient from "./client";
import * as driver from "./driver";

describe("iterm/driver pass-through", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards sessionExists", async () => {
    expect(await driver.sessionExists("a")).toBe(false);
    expect(wsClient.sessionExists).toHaveBeenCalledWith("a");
  });

  it("forwards createWindow", async () => {
    expect(await driver.createWindow("cmd")).toEqual({ windowId: "ws-w", sessionId: "ws-s" });
    expect(wsClient.createWindow).toHaveBeenCalledWith("cmd", {});
  });

  it("forwards createWindow opts (e.g. activate:false for background launch)", async () => {
    await driver.createWindow("cmd", { activate: false });
    expect(wsClient.createWindow).toHaveBeenCalledWith("cmd", { activate: false });
  });

  it("forwards createTab", async () => {
    await driver.createTab("cmd", "w");
    expect(wsClient.createTab).toHaveBeenCalledWith("cmd", "w", {});
  });

  it("forwards createTab opts (activate:false for background launch)", async () => {
    await driver.createTab("cmd", "w", { activate: false });
    expect(wsClient.createTab).toHaveBeenCalledWith("cmd", "w", { activate: false });
  });

  it("forwards splitSession", async () => {
    expect(await driver.splitSession("p", "vertical", "cmd")).toBe("ws-split");
    expect(wsClient.splitSession).toHaveBeenCalledWith("p", "vertical", "cmd");
  });

  it("forwards setSessionName", async () => {
    await driver.setSessionName("s", "name");
    expect(wsClient.setSessionName).toHaveBeenCalledWith("s", "name");
  });

  it("forwards setWindowName", async () => {
    await driver.setWindowName("w", "title");
    expect(wsClient.setWindowName).toHaveBeenCalledWith("w", "title");
  });

  it("forwards selectSession", async () => {
    await driver.selectSession("s");
    expect(wsClient.selectSession).toHaveBeenCalledWith("s");
  });

  it("forwards buildLayoutWindow", async () => {
    await driver.buildLayoutWindow("1x1", ["a"]);
    expect(wsClient.buildLayoutWindow).toHaveBeenCalledWith("1x1", ["a"]);
  });

  it("forwards applySplit", async () => {
    const op = { from: 0, dir: "vertical" as const };
    await driver.applySplit(["c0"], op, "cmd");
    expect(wsClient.applySplit).toHaveBeenCalledWith(["c0"], op, "cmd");
  });
});
