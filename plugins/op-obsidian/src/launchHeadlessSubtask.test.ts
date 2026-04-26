import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "events";
import {
  buildArgs,
  launchHeadlessSubtask,
  HeadlessExitError,
  HeadlessParseError,
  HeadlessTimeoutError,
} from "./launchHeadlessSubtask";
import { makeTestRelay, type RelaySession } from "./relaySession";

interface FakeChild extends EventEmitter {
  stdout: EventEmitter;
  stderr: EventEmitter;
  kill: (signal?: NodeJS.Signals) => boolean;
  killed?: boolean;
  killedSignals: NodeJS.Signals[];
}

function makeChild(): FakeChild {
  const child = new EventEmitter() as FakeChild;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.killedSignals = [];
  child.kill = (signal?: NodeJS.Signals) => {
    child.killedSignals.push(signal ?? "SIGTERM");
    return true;
  };
  return child;
}

function push(stream: EventEmitter, data: string) {
  stream.emit("data", data);
}

function end(_stream: EventEmitter) {
  /* no-op: close event on the child handles completion */
}

function testRelay(): { relay: RelaySession; capture: ReturnType<typeof vi.fn> } {
  const capture = vi.fn();
  const relay = makeTestRelay(capture);
  return { relay, capture };
}

describe("buildArgs", () => {
  it("defaults to -p --output-format json + prompt", () => {
    const args = buildArgs({ prompt: "hi", relaySession: makeTestRelay() });
    expect(args).toEqual(["-p", "--output-format", "json", "hi"]);
  });

  it("inlines --agents JSON and --agent name", () => {
    const args = buildArgs({
      prompt: "evaluate",
      agents: { foo: { prompt: "you are foo", tools: ["Read"] } },
      agent: "foo",
      relaySession: makeTestRelay(),
    });
    const agentsIdx = args.indexOf("--agents");
    expect(agentsIdx).toBeGreaterThan(-1);
    expect(JSON.parse(args[agentsIdx + 1])).toEqual({
      foo: { prompt: "you are foo", tools: ["Read"] },
    });
    expect(args).toContain("--agent");
    expect(args[args.indexOf("--agent") + 1]).toBe("foo");
  });

  it("passes sandbox flags and model", () => {
    const args = buildArgs({
      prompt: "x",
      model: "haiku",
      allowedTools: ["Read", "Grep"],
      disallowedTools: ["Bash", "Edit"],
      permissionMode: "dontAsk",
      relaySession: makeTestRelay(),
    });
    expect(args).toContain("--model");
    expect(args[args.indexOf("--model") + 1]).toBe("haiku");
    expect(args[args.indexOf("--allowedTools") + 1]).toBe("Read Grep");
    expect(args[args.indexOf("--disallowedTools") + 1]).toBe("Bash Edit");
    expect(args[args.indexOf("--permission-mode") + 1]).toBe("dontAsk");
  });

  it("places prompt last", () => {
    const args = buildArgs({ prompt: "final", model: "haiku", relaySession: makeTestRelay() });
    expect(args[args.length - 1]).toBe("final");
  });
});

describe("launchHeadlessSubtask", () => {
  it("parses a successful JSON response into { text, jsonResult }", async () => {
    const child = makeChild();
    const spawnFn = vi.fn(() => child as any);
    const { relay } = testRelay();

    const promise = launchHeadlessSubtask({ prompt: "hello", relaySession: relay, spawnFn });

    queueMicrotask(() => {
      push(child.stdout, JSON.stringify({
        type: "result",
        subtype: "success",
        is_error: false,
        result: "hello back",
        total_cost_usd: 0.013,
      }));
      end(child.stdout);
      end(child.stderr);
      child.emit("close", 0, null);
    });

    const res = await promise;
    expect(res.text).toBe("hello back");
    expect((res.jsonResult as any).result).toBe("hello back");
    expect(res.exitCode).toBe(0);
    expect(spawnFn).toHaveBeenCalledWith(
      "claude",
      expect.arrayContaining(["-p", "--output-format", "json"]),
      expect.objectContaining({ stdio: ["ignore", "pipe", "pipe"] }),
    );
  });

  it("throws HeadlessExitError on non-zero exit, surfacing stderr", async () => {
    const child = makeChild();
    const promise = launchHeadlessSubtask({
      prompt: "x",
      relaySession: makeTestRelay(),
      spawnFn: () => child as any,
    });

    queueMicrotask(() => {
      push(child.stderr, "boom");
      end(child.stdout);
      end(child.stderr);
      child.emit("close", 2, null);
    });

    await expect(promise).rejects.toBeInstanceOf(HeadlessExitError);
    try {
      await promise;
    } catch (err) {
      expect(err).toBeInstanceOf(HeadlessExitError);
      expect((err as HeadlessExitError).exitCode).toBe(2);
      expect((err as HeadlessExitError).stderr).toBe("boom");
    }
  });

  it("throws HeadlessParseError on malformed stdout", async () => {
    const child = makeChild();
    const promise = launchHeadlessSubtask({
      prompt: "x",
      relaySession: makeTestRelay(),
      spawnFn: () => child as any,
    });

    queueMicrotask(() => {
      push(child.stdout, "not json");
      end(child.stdout);
      end(child.stderr);
      child.emit("close", 0, null);
    });

    await expect(promise).rejects.toBeInstanceOf(HeadlessParseError);
  });

  it("throws HeadlessTimeoutError and SIGTERMs the child after timeoutMs", async () => {
    vi.useFakeTimers();
    try {
      const child = makeChild();
      const promise = launchHeadlessSubtask({
        prompt: "x",
        timeoutMs: 100,
        relaySession: makeTestRelay(),
        spawnFn: () => child as any,
      });
      // Attach rejection handler immediately so the rejection isn't reported
      // as unhandled when we advance timers.
      const settled = promise.catch((e) => e);
      await vi.advanceTimersByTimeAsync(150);
      const err = await settled;
      expect(err).toBeInstanceOf(HeadlessTimeoutError);
      expect((err as HeadlessTimeoutError).timeoutMs).toBe(100);
      expect(child.killedSignals).toContain("SIGTERM");
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects an invalid timeoutMs", async () => {
    await expect(
      launchHeadlessSubtask({
        prompt: "x",
        timeoutMs: 0,
        relaySession: makeTestRelay(),
        spawnFn: () => makeChild() as any,
      }),
    ).rejects.toThrow(/invalid timeoutMs/);
    await expect(
      launchHeadlessSubtask({
        prompt: "x",
        timeoutMs: -1,
        relaySession: makeTestRelay(),
        spawnFn: () => makeChild() as any,
      }),
    ).rejects.toThrow(/invalid timeoutMs/);
  });

  it("requires a non-empty prompt", async () => {
    await expect(
      launchHeadlessSubtask({ prompt: "", relaySession: makeTestRelay() } as any),
    ).rejects.toThrow(/prompt is required/);
  });

  it("propagates child spawn 'error' events", async () => {
    const child = makeChild();
    const promise = launchHeadlessSubtask({
      prompt: "x",
      relaySession: makeTestRelay(),
      spawnFn: () => child as any,
    });
    queueMicrotask(() => child.emit("error", new Error("ENOENT")));
    await expect(promise).rejects.toThrow(/ENOENT/);
  });

  it("uses claudeBinary override when provided", async () => {
    const child = makeChild();
    const spawnFn = vi.fn(() => child as any);
    const promise = launchHeadlessSubtask({
      prompt: "x",
      claudeBinary: "/custom/claude",
      relaySession: makeTestRelay(),
      spawnFn,
    });
    queueMicrotask(() => {
      push(child.stdout, JSON.stringify({ result: "ok" }));
      end(child.stdout);
      end(child.stderr);
      child.emit("close", 0, null);
    });
    await promise;
    expect(spawnFn.mock.calls[0][0]).toBe("/custom/claude");
  });

  it("emits status-line at start, streams stdout/stderr through capture, and emits status-line at completion", async () => {
    const { relay, capture } = testRelay();
    const child = makeChild();
    const promise = launchHeadlessSubtask({
      prompt: "go",
      agent: "op-evaluate",
      relaySession: relay,
      spawnFn: () => child as any,
    });

    queueMicrotask(() => {
      // Stream the JSON payload as one chunk so JSON.parse succeeds; emit a
      // separate stderr chunk so the relay sees both stream sources.
      push(child.stderr, "warning: configured nicely\n");
      push(child.stdout, JSON.stringify({ result: "done" }));
      child.emit("close", 0, null);
    });

    await promise;

    const calls = capture.mock.calls.map((c) => c[0] as string);
    // First call: start status-line.
    expect(calls[0]).toMatch(/^\[status\] launching headless subtask: op-evaluate/);
    // Stream chunks land between start + completion (one stdout, one stderr).
    expect(calls).toContainEqual(expect.stringMatching(/^\[stream\] warning: configured nicely/));
    expect(calls).toContainEqual(expect.stringMatching(/^\[stream\] \{"result":"done"\}/));
    // Last call: completion status-line.
    expect(calls[calls.length - 1]).toMatch(/^\[status\] headless subtask completed in /);
  });

  it("emits a status-line on non-zero exit so the relay always closes the loop", async () => {
    const { relay, capture } = testRelay();
    const child = makeChild();
    const promise = launchHeadlessSubtask({
      prompt: "x",
      relaySession: relay,
      spawnFn: () => child as any,
    });
    queueMicrotask(() => {
      push(child.stderr, "boom");
      child.emit("close", 7, null);
    });
    await expect(promise).rejects.toBeInstanceOf(HeadlessExitError);
    const calls = capture.mock.calls.map((c) => c[0] as string);
    expect(calls.find((s) => /^\[status\] headless subtask exited 7/.test(s))).toBeTruthy();
  });

  it("emits a status-line on timeout so the relay always closes the loop", async () => {
    vi.useFakeTimers();
    try {
      const { relay, capture } = testRelay();
      const child = makeChild();
      const promise = launchHeadlessSubtask({
        prompt: "x",
        timeoutMs: 50,
        relaySession: relay,
        spawnFn: () => child as any,
      });
      const settled = promise.catch((e) => e);
      await vi.advanceTimersByTimeAsync(75);
      await settled;
      const calls = capture.mock.calls.map((c) => c[0] as string);
      expect(calls.find((s) => /^\[status\] headless subtask timed out/.test(s))).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("type-checker rejects callers that omit relaySession", () => {
    // @ts-expect-error — relaySession is required; missing it must fail compile.
    const _missingRelay = () => launchHeadlessSubtask({ prompt: "x" });
    expect(typeof _missingRelay).toBe("function");
  });
});
