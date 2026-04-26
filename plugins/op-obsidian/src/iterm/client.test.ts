import { describe, expect, it, vi } from "vitest";
import { findSessionId } from "./client";
import { iterm2 } from "./proto/api.generated";
import type { ITermTransport } from "./transport";

// Fake transport captures the last request and returns a caller-supplied reply.
function fakeTransport(
  reply: iterm2.IServerOriginatedMessage,
): { transport: ITermTransport; last: { msg: iterm2.IClientOriginatedMessage | null } } {
  const last: { msg: iterm2.IClientOriginatedMessage | null } = { msg: null };
  const transport = {
    request: vi.fn(async (msg: iterm2.IClientOriginatedMessage) => {
      last.msg = msg;
      return iterm2.ServerOriginatedMessage.create(reply);
    }),
    connect: vi.fn(async () => undefined),
    close: vi.fn(),
  } as unknown as ITermTransport;
  return { transport, last };
}

async function withTransport<T>(
  reply: iterm2.IServerOriginatedMessage,
  fn: (last: { msg: iterm2.IClientOriginatedMessage | null }) => Promise<T>,
): Promise<T> {
  const { transport, last } = fakeTransport(reply);
  const conn = await import("./connection");
  conn.__setStateForTests({ transport, cookie: { cookie: "c", key: "k" }, socketPath: "/tmp/fake" });
  const client = await import("./client");
  client.configureClient({ version: "test" });
  try {
    return await fn(last);
  } finally {
    conn.__setStateForTests(null);
  }
}

// findSessionId walks the ListSessionsResponse tree (windows → tabs →
// SplitTreeNode recursion + minimized + buried). The proto is annoying enough
// that the parser is the bug-prone bit; the network round-trip is tested
// against a real iTerm during smoke. These tests cover the parser shape only.
describe("client.findSessionId", () => {
  it("finds a session nested inside a split tree", () => {
    const reply = iterm2.ListSessionsResponse.create({
      windows: [
        {
          windowId: "w1",
          tabs: [
            {
              tabId: "t1",
              root: {
                vertical: true,
                links: [
                  { session: { uniqueIdentifier: "left" } },
                  {
                    node: {
                      vertical: false,
                      links: [
                        { session: { uniqueIdentifier: "top-right" } },
                        { session: { uniqueIdentifier: "bottom-right" } },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    expect(findSessionId(reply, "left")).toBe(true);
    expect(findSessionId(reply, "top-right")).toBe(true);
    expect(findSessionId(reply, "bottom-right")).toBe(true);
    expect(findSessionId(reply, "missing")).toBe(false);
  });

  it("finds a buried session", () => {
    const reply = iterm2.ListSessionsResponse.create({
      buriedSessions: [{ uniqueIdentifier: "buried-1" }],
    });
    expect(findSessionId(reply, "buried-1")).toBe(true);
    expect(findSessionId(reply, "buried-2")).toBe(false);
  });

  it("finds a minimized session", () => {
    const reply = iterm2.ListSessionsResponse.create({
      windows: [
        {
          tabs: [
            {
              tabId: "t1",
              minimizedSessions: [{ uniqueIdentifier: "min-1" }],
            },
          ],
        },
      ],
    });
    expect(findSessionId(reply, "min-1")).toBe(true);
  });

  it("returns false on an empty reply", () => {
    const reply = iterm2.ListSessionsResponse.create({});
    expect(findSessionId(reply, "anything")).toBe(false);
  });
});

describe("client write ops (fake transport)", () => {
  it("createTab sends CreateTabRequest with windowId + Command and returns ids", async () => {
    await withTransport(
      {
        createTabResponse: {
          status: iterm2.CreateTabResponse.Status.OK,
          windowId: "w-existing",
          sessionId: "s-new",
        },
      },
      async (last) => {
        const { createTab } = await import("./client");
        const res = await createTab("bash /tmp/y.sh", "w-existing");
        expect(res).toEqual({ windowId: "w-existing", sessionId: "s-new" });
        const req = last.msg?.createTabRequest;
        expect(req?.windowId).toBe("w-existing");
        const props = req?.customProfileProperties ?? [];
        const byKey = Object.fromEntries(props.map((p) => [p.key, p.jsonValue]));
        expect(byKey["Custom Command"]).toBe(JSON.stringify("Yes"));
        expect(byKey["Command"]).toBe(JSON.stringify("bash /tmp/y.sh"));
      },
    );
  });

  it("createTab throws on non-OK status", async () => {
    await withTransport(
      {
        createTabResponse: {
          status: iterm2.CreateTabResponse.Status.INVALID_WINDOW_ID,
        },
      },
      async () => {
        const { createTab } = await import("./client");
        await expect(createTab("cmd", "w-bad")).rejects.toThrow(
          /createTab\(window=w-bad\) failed/,
        );
      },
    );
  });

  it("activeWindowId returns the windowId of the BECAME_KEY entry", async () => {
    await withTransport(
      {
        focusResponse: {
          notifications: [
            { applicationActive: true },
            {
              window: {
                windowStatus:
                  iterm2.FocusChangedNotification.Window.WindowStatus.TERMINAL_WINDOW_BECAME_KEY,
                windowId: "w-key",
              },
            },
          ],
        },
      },
      async () => {
        const { activeWindowId } = await import("./client");
        expect(await activeWindowId()).toBe("w-key");
      },
    );
  });

  it("activeWindowId returns undefined when no window is key", async () => {
    await withTransport(
      {
        focusResponse: {
          notifications: [
            {
              window: {
                windowStatus:
                  iterm2.FocusChangedNotification.Window.WindowStatus.TERMINAL_WINDOW_RESIGNED_KEY,
                windowId: "w-not-key",
              },
            },
          ],
        },
      },
      async () => {
        const { activeWindowId } = await import("./client");
        expect(await activeWindowId()).toBeUndefined();
      },
    );
  });

  it("createWindow sends CreateTabRequest with Command custom property and returns ids", async () => {
    await withTransport(
      {
        createTabResponse: {
          status: iterm2.CreateTabResponse.Status.OK,
          windowId: "w-1",
          sessionId: "s-1",
        },
      },
      async (last) => {
        const { createWindow } = await import("./client");
        const res = await createWindow("bash /tmp/x.sh");
        expect(res).toEqual({ windowId: "w-1", sessionId: "s-1" });
        // Last captured call is the createTab (the pre-activate fires first).
        const props = last.msg?.createTabRequest?.customProfileProperties ?? [];
        const byKey = Object.fromEntries(props.map((p) => [p.key, p.jsonValue]));
        expect(byKey["Custom Command"]).toBe(JSON.stringify("Yes"));
        expect(byKey["Command"]).toBe(JSON.stringify("bash /tmp/x.sh"));
      },
    );
  });

  it("splitSession sends SplitPaneRequest with direction + command", async () => {
    await withTransport(
      {
        splitPaneResponse: {
          status: iterm2.SplitPaneResponse.Status.OK,
          sessionId: ["new-s"],
        },
      },
      async (last) => {
        const { splitSession } = await import("./client");
        const id = await splitSession("parent", "vertical", "bash -lc cmd");
        expect(id).toBe("new-s");
        const msg = last.msg;
        expect(msg?.splitPaneRequest?.session).toBe("parent");
        expect(msg?.splitPaneRequest?.splitDirection).toBe(
          iterm2.SplitPaneRequest.SplitDirection.VERTICAL,
        );
        const props = msg?.splitPaneRequest?.customProfileProperties ?? [];
        const byKey = Object.fromEntries(props.map((p) => [p.key, p.jsonValue]));
        expect(byKey["Custom Command"]).toBe(JSON.stringify("Yes"));
        expect(byKey["Command"]).toBe(JSON.stringify("bash -lc cmd"));
      },
    );
  });

  it("splitSession throws on non-OK status", async () => {
    await withTransport(
      {
        splitPaneResponse: {
          status: iterm2.SplitPaneResponse.Status.CANNOT_SPLIT,
          sessionId: [],
        },
      },
      async () => {
        const { splitSession } = await import("./client");
        await expect(splitSession("s", "horizontal", "x")).rejects.toThrow(
          /splitSession failed/,
        );
      },
    );
  });

  it("setSessionName invokes iterm2.set_name via the Method context with JSON-escaped name", async () => {
    await withTransport(
      { invokeFunctionResponse: { success: { jsonResult: "null" } } },
      async (last) => {
        const { setSessionName } = await import("./client");
        await setSessionName("sess", 'name with "quote"');
        const req = last.msg?.invokeFunctionRequest;
        expect(req?.invocation).toBe(`iterm2.set_name(name: ${JSON.stringify('name with "quote"')})`);
        expect(req?.method?.receiver).toBe("sess");
        expect(req?.session?.sessionId).toBeFalsy();
      },
    );
  });

  it("setWindowName swallows errors (best-effort)", async () => {
    await withTransport(
      {
        invokeFunctionResponse: {
          error: {
            status: iterm2.InvokeFunctionResponse.Status.FAILED,
            errorReason: "read-only",
          },
        },
      },
      async () => {
        const { setWindowName } = await import("./client");
        await expect(setWindowName("w-1", "some title")).resolves.toBeUndefined();
      },
    );
  });

  it("selectSession sends ActivateRequest with select flags", async () => {
    await withTransport(
      { activateResponse: { status: iterm2.ActivateResponse.Status.OK } },
      async (last) => {
        const { selectSession } = await import("./client");
        await selectSession("s-1");
        const req = last.msg?.activateRequest;
        expect(req?.sessionId).toBe("s-1");
        expect(req?.selectSession).toBe(true);
        expect(req?.selectTab).toBe(true);
        expect(req?.orderWindowFront).toBe(true);
        expect(req?.activateApp?.raiseAllWindows).toBe(true);
      },
    );
  });

  it("surfaces server-originated error oneof", async () => {
    await withTransport({ error: "bad request" }, async () => {
      const { selectSession } = await import("./client");
      await expect(selectSession("s")).rejects.toThrow(/iTerm API error: bad request/);
    });
  });
});

// OP-155 §4 Step 1: createTab/createWindow expose an `activate` flag (default
// true). Background-launch passes `activate: false` so iTerm doesn't come to
// the foreground when an agent launches. Behavior is verified by counting
// requests through a multi-message transport: the activate-then-create pair
// becomes a single create when the flag is off.
function multiTransport(reply: iterm2.IServerOriginatedMessage): {
  transport: ITermTransport;
  messages: iterm2.IClientOriginatedMessage[];
} {
  const messages: iterm2.IClientOriginatedMessage[] = [];
  const transport = {
    request: vi.fn(async (msg: iterm2.IClientOriginatedMessage) => {
      messages.push(msg);
      return iterm2.ServerOriginatedMessage.create(reply);
    }),
    connect: vi.fn(async () => undefined),
    close: vi.fn(),
  } as unknown as ITermTransport;
  return { transport, messages };
}

async function withMultiTransport<T>(
  reply: iterm2.IServerOriginatedMessage,
  fn: (
    messages: iterm2.IClientOriginatedMessage[],
  ) => Promise<T>,
): Promise<T> {
  const { transport, messages } = multiTransport(reply);
  const conn = await import("./connection");
  conn.__setStateForTests({ transport, cookie: { cookie: "c", key: "k" }, socketPath: "/tmp/fake" });
  const client = await import("./client");
  client.configureClient({ version: "test" });
  try {
    return await fn(messages);
  } finally {
    conn.__setStateForTests(null);
  }
}

describe("client activate flag (OP-155 Step 1)", () => {
  it("createWindow with activate:false skips the ActivateRequest", async () => {
    await withMultiTransport(
      {
        createTabResponse: {
          status: iterm2.CreateTabResponse.Status.OK,
          windowId: "w-1",
          sessionId: "s-1",
        },
      },
      async (messages) => {
        const { createWindow } = await import("./client");
        await createWindow("bash /tmp/x.sh", { activate: false });
        const types = messages.map((m) =>
          m.activateRequest ? "activate" : m.createTabRequest ? "createTab" : "?",
        );
        expect(types).toEqual(["createTab"]);
      },
    );
  });

  it("createWindow with activate:true (default) sends ActivateRequest first", async () => {
    await withMultiTransport(
      {
        createTabResponse: {
          status: iterm2.CreateTabResponse.Status.OK,
          windowId: "w-1",
          sessionId: "s-1",
        },
      },
      async (messages) => {
        const { createWindow } = await import("./client");
        await createWindow("bash /tmp/x.sh");
        const types = messages.map((m) =>
          m.activateRequest ? "activate" : m.createTabRequest ? "createTab" : "?",
        );
        expect(types).toEqual(["activate", "createTab"]);
      },
    );
  });

  it("createTab with activate:false skips the ActivateRequest", async () => {
    await withMultiTransport(
      {
        createTabResponse: {
          status: iterm2.CreateTabResponse.Status.OK,
          windowId: "w-existing",
          sessionId: "s-new",
        },
      },
      async (messages) => {
        const { createTab } = await import("./client");
        await createTab("bash /tmp/y.sh", "w-existing", { activate: false });
        const types = messages.map((m) =>
          m.activateRequest ? "activate" : m.createTabRequest ? "createTab" : "?",
        );
        expect(types).toEqual(["createTab"]);
      },
    );
  });

  it("createTab default behavior is unchanged (activates first)", async () => {
    await withMultiTransport(
      {
        createTabResponse: {
          status: iterm2.CreateTabResponse.Status.OK,
          windowId: "w-existing",
          sessionId: "s-new",
        },
      },
      async (messages) => {
        const { createTab } = await import("./client");
        await createTab("bash /tmp/y.sh", "w-existing");
        const types = messages.map((m) =>
          m.activateRequest ? "activate" : m.createTabRequest ? "createTab" : "?",
        );
        expect(types).toEqual(["activate", "createTab"]);
      },
    );
  });
});
