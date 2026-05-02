import { describe, expect, it, vi } from "vitest";
import { dispatchPostLaunch, type ExecShim } from "./postLaunchDispatch";

describe("dispatchPostLaunch", () => {
  it("polls for readiness and sends each command with a trailing Enter", async () => {
    const calls: Array<readonly string[]> = [];
    const exec: ExecShim = async (_file, args) => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return { stdout: "/ commands · ? help", stderr: "" };
      }
      return { stdout: "", stderr: "" };
    };

    const result = await dispatchPostLaunch({
      tmuxBinary: "tmux",
      tmuxSession: "op-agents",
      tmuxWindow: "OP-1",
      commands: ["/rename OP-1 title"],
      readinessRegex: /\/ commands\s+·\s+\? help/,
      interCommandDelayMs: 0,
      exec,
    });

    expect(result).toEqual({ sent: 1, readinessHit: true });
    expect(calls).toEqual([
      ["capture-pane", "-p", "-J", "-t", "op-agents:OP-1"],
      ["send-keys", "-t", "op-agents:OP-1", "-l", "/rename OP-1 title"],
      ["send-keys", "-t", "op-agents:OP-1", "Enter"],
    ]);
  });

  it("warns on readiness timeout and still sends commands", async () => {
    const exec = vi.fn<ExecShim>(async (_file, args) => {
      if (args[0] === "capture-pane") return { stdout: "booting", stderr: "" };
      return { stdout: "", stderr: "" };
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await dispatchPostLaunch({
      tmuxBinary: "tmux",
      tmuxSession: "op-agents",
      tmuxWindow: "OP-2",
      commands: ["/rename OP-2"],
      readinessRegex: /ready/,
      readinessTimeoutMs: 0,
      pollIntervalMs: 0,
      interCommandDelayMs: 0,
      exec,
    });

    expect(result).toEqual({ sent: 1, readinessHit: false });
    expect(warn).toHaveBeenCalledWith(
      "[op-obsidian] post-launch readiness timeout — sending commands anyway",
    );
    expect(exec.mock.calls.slice(-2).map((call) => call[1])).toEqual([
      ["send-keys", "-t", "op-agents:OP-2", "-l", "/rename OP-2"],
      ["send-keys", "-t", "op-agents:OP-2", "Enter"],
    ]);

    warn.mockRestore();
  });

  it("sends commands immediately when no readiness regex is configured", async () => {
    const exec = vi.fn<ExecShim>(async () => ({ stdout: "", stderr: "" }));

    const result = await dispatchPostLaunch({
      tmuxBinary: "tmux",
      tmuxSession: "op-agents",
      tmuxWindow: "OP-3",
      commands: ["/rename OP-3"],
      interCommandDelayMs: 0,
      exec,
    });

    expect(result).toEqual({ sent: 1, readinessHit: false });
    expect(exec.mock.calls.map((call) => call[1])).toEqual([
      ["send-keys", "-t", "op-agents:OP-3", "-l", "/rename OP-3"],
      ["send-keys", "-t", "op-agents:OP-3", "Enter"],
    ]);
  });

  it("no-ops when there are no commands", async () => {
    const exec = vi.fn<ExecShim>(async () => ({ stdout: "", stderr: "" }));
    const result = await dispatchPostLaunch({
      tmuxBinary: "tmux",
      tmuxSession: "op-agents",
      tmuxWindow: "OP-4",
      commands: [],
      readinessRegex: /ready/,
      exec,
    });

    expect(result).toEqual({ sent: 0, readinessHit: false });
    expect(exec).not.toHaveBeenCalled();
  });
});
