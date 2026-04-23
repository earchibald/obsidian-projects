import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { EventBus } from "./eventBus";
import type { LifecycleEvent } from "./types";

const makeEvent = (): LifecycleEvent =>
  ({ kind: "issue:deleted", path: "X.md", prev: { id: "X-1" } } as unknown as LifecycleEvent);

describe("EventBus", () => {
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errSpy.mockRestore();
  });

  it("a throwing handler does not poison subsequent handlers", () => {
    const bus = new EventBus();
    const calls: string[] = [];
    bus.on("issue:deleted", () => {
      calls.push("a");
      throw new Error("boom");
    });
    bus.on("issue:deleted", () => {
      calls.push("b");
    });
    bus.on("*", () => {
      calls.push("c");
    });
    bus.emit(makeEvent());
    expect(calls).toEqual(["a", "b", "c"]);
    expect(errSpy).toHaveBeenCalled();
  });

  it("close awaits promises returned by handlers", async () => {
    const bus = new EventBus();
    let resolve: (() => void) | undefined;
    const work = new Promise<void>((r) => {
      resolve = r;
    });
    let done = false;
    bus.on("issue:deleted", () => work.then(() => void (done = true)));
    bus.emit(makeEvent());
    const closed = bus.close();
    expect(done).toBe(false);
    resolve!();
    await closed;
    expect(done).toBe(true);
  });

  it("a rejecting async handler is logged and does not break close", async () => {
    const bus = new EventBus();
    bus.on("issue:deleted", () => Promise.reject(new Error("nope")));
    bus.emit(makeEvent());
    await bus.close();
    expect(errSpy).toHaveBeenCalled();
  });

  it("sealed bus refuses new registrations and emits", async () => {
    const bus = new EventBus();
    await bus.close();
    const fn = vi.fn();
    const off = bus.on("issue:deleted", fn);
    bus.emit(makeEvent());
    expect(fn).not.toHaveBeenCalled();
    expect(typeof off).toBe("function");
    off();
  });
});
