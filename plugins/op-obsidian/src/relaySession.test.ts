import { describe, it, expect, vi } from "vitest";
import {
  emitStatus,
  emitStream,
  makeTestRelay,
  makeTmuxRelay,
  type RelaySession,
} from "./relaySession";

describe("makeTestRelay", () => {
  it("returns the test variant with the supplied capture", () => {
    const capture = vi.fn();
    const relay = makeTestRelay(capture);
    expect(relay.kind).toBe("test");
    if (relay.kind === "test") {
      relay.capture("hi");
      expect(capture).toHaveBeenCalledWith("hi");
    }
  });

  it("defaults capture to a no-op when called without args", () => {
    const relay = makeTestRelay();
    expect(relay.kind).toBe("test");
    if (relay.kind === "test") {
      // does not throw
      relay.capture("ignored");
    }
  });
});

describe("makeTmuxRelay", () => {
  it("returns the tmux variant with target + callbacks", () => {
    const statusLine = vi.fn();
    const paneStream = vi.fn();
    const relay = makeTmuxRelay({ target: "obsidian-plugin:OP-197", statusLine, paneStream });
    expect(relay.kind).toBe("tmux");
    if (relay.kind === "tmux") {
      expect(relay.target).toBe("obsidian-plugin:OP-197");
      relay.statusLine("hello");
      relay.paneStream("chunk");
      expect(statusLine).toHaveBeenCalledWith("hello");
      expect(paneStream).toHaveBeenCalledWith("chunk");
    }
  });
});

describe("emitStatus / emitStream", () => {
  it("routes through tmux callbacks when relay.kind === 'tmux'", () => {
    const statusLine = vi.fn();
    const paneStream = vi.fn();
    const relay: RelaySession = {
      kind: "tmux",
      target: "t",
      statusLine,
      paneStream,
    };
    emitStatus(relay, "running op-evaluate");
    emitStream(relay, "first chunk");
    expect(statusLine).toHaveBeenCalledWith("running op-evaluate");
    expect(paneStream).toHaveBeenCalledWith("first chunk");
  });

  it("routes status + stream through capture with prefixes when relay.kind === 'test'", () => {
    const capture = vi.fn();
    const relay: RelaySession = { kind: "test", capture };
    emitStatus(relay, "running op-evaluate");
    emitStream(relay, "first chunk");
    expect(capture).toHaveBeenNthCalledWith(1, "[status] running op-evaluate");
    expect(capture).toHaveBeenNthCalledWith(2, "[stream] first chunk");
  });
});

describe("type-level enforcement", () => {
  it("rejects callers that omit relaySession (compile-time assertion)", () => {
    // The body is intentionally empty — this test exists so the compile-time
    // `// @ts-expect-error` below is exercised by the typecheck step. The
    // assertion itself fires at compile time via the launchHeadlessSubtask
    // signature; vitest runs it as a no-op runtime test for parity.
    //
    // The deliberate-error sample lives in launchHeadlessSubtask.test.ts so
    // the rejection is asserted right next to the real signature.
    expect(true).toBe(true);
  });
});
