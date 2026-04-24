import { describe, it, expect, vi } from "vitest";
import { EventEmitter } from "events";
import {
  buildArgs,
  launchHeadless,
  HeadlessExitError,
  HeadlessParseError,
  HeadlessTimeoutError,
} from "./launchHeadless";

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

describe("buildArgs", () => {
  it("defaults to -p --output-format json + prompt", () => {
    const args = buildArgs({ prompt: "hi" });
    expect(args).toEqual(["-p", "--output-format", "json", "hi"]);
  });

  it("inlines --agents JSON and --agent name", () => {
    const args = buildArgs({
      prompt: "evaluate",
      agents: { foo: { prompt: "you are foo", tools: ["Read"] } },
      agent: "foo",
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
    });
    expect(args).toContain("--model");
    expect(args[args.indexOf("--model") + 1]).toBe("haiku");
    expect(args[args.indexOf("--allowedTools") + 1]).toBe("Read Grep");
    expect(args[args.indexOf("--disallowedTools") + 1]).toBe("Bash Edit");
    expect(args[args.indexOf("--permission-mode") + 1]).toBe("dontAsk");
  });

  it("places prompt last", () => {
    const args = buildArgs({ prompt: "final", model: "haiku" });
    expect(args[args.length - 1]).toBe("final");
  });
});

describe("launchHeadless", () => {
  it("parses a successful JSON response into { text, jsonResult }", async () => {
    const child = makeChild();
    const spawnFn = vi.fn(() => child as any);

    const promise = launchHeadless({ prompt: "hello", spawnFn });

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
    const promise = launchHeadless({ prompt: "x", spawnFn: () => child as any });

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
    const promise = launchHeadless({ prompt: "x", spawnFn: () => child as any });

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
      const promise = launchHeadless({
        prompt: "x",
        timeoutMs: 100,
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
      launchHeadless({ prompt: "x", timeoutMs: 0, spawnFn: () => makeChild() as any }),
    ).rejects.toThrow(/invalid timeoutMs/);
    await expect(
      launchHeadless({ prompt: "x", timeoutMs: -1, spawnFn: () => makeChild() as any }),
    ).rejects.toThrow(/invalid timeoutMs/);
  });

  it("requires a non-empty prompt", async () => {
    await expect(launchHeadless({ prompt: "" } as any)).rejects.toThrow(/prompt is required/);
  });

  it("propagates child spawn 'error' events", async () => {
    const child = makeChild();
    const promise = launchHeadless({ prompt: "x", spawnFn: () => child as any });
    queueMicrotask(() => child.emit("error", new Error("ENOENT")));
    await expect(promise).rejects.toThrow(/ENOENT/);
  });

  it("uses claudeBinary override when provided", async () => {
    const child = makeChild();
    const spawnFn = vi.fn(() => child as any);
    const promise = launchHeadless({
      prompt: "x",
      claudeBinary: "/custom/claude",
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
});
