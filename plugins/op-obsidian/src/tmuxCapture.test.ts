import { describe, it, expect, vi } from "vitest";
import { captureTmuxPane, clampHoverLines, type ExecShim } from "./tmuxCapture";

describe("clampHoverLines", () => {
  it("clamps below 1 to 1", () => {
    expect(clampHoverLines(0)).toBe(1);
    expect(clampHoverLines(-50)).toBe(1);
  });

  it("clamps above 500 to 500", () => {
    expect(clampHoverLines(501)).toBe(500);
    expect(clampHoverLines(10_000)).toBe(500);
  });

  it("floors fractional values", () => {
    expect(clampHoverLines(30.7)).toBe(30);
  });

  it("NaN falls back to MIN (1); Infinity clamps to MAX (500)", () => {
    expect(clampHoverLines(NaN)).toBe(1);
    expect(clampHoverLines(Infinity)).toBe(500);
  });
});

describe("captureTmuxPane", () => {
  it("invokes execFile with the documented argv", async () => {
    const exec = vi.fn<ExecShim>(async () => ({ stdout: "hello\n", stderr: "" }));
    await captureTmuxPane("/opt/homebrew/bin/tmux", "op-agents", "OP-1", 30, exec);
    expect(exec).toHaveBeenCalledTimes(1);
    expect(exec.mock.calls[0]![0]).toBe("/opt/homebrew/bin/tmux");
    expect(exec.mock.calls[0]![1]).toEqual([
      "capture-pane",
      "-p",
      "-J",
      "-t",
      "op-agents:OP-1",
      "-S",
      "-30",
    ]);
  });

  it("returns null on rejection (window gone, tmux missing, timeout)", async () => {
    const exec: ExecShim = async () => {
      throw Object.assign(new Error("no server running"), { code: 1 });
    };
    expect(await captureTmuxPane("tmux", "op-agents", "OP-99", 30, exec)).toBeNull();
  });

  it("trims trailing whitespace from stdout", async () => {
    const exec: ExecShim = async () => ({ stdout: "line1\nline2\n   \n\n", stderr: "" });
    const out = await captureTmuxPane("tmux", "op-agents", "OP-1", 30, exec);
    expect(out).toBe("line1\nline2");
  });

  it("returns null when stdout is blank", async () => {
    const exec: ExecShim = async () => ({ stdout: "   \n\n", stderr: "" });
    expect(await captureTmuxPane("tmux", "op-agents", "OP-1", 30, exec)).toBeNull();
  });

  it("clamps lines into [1, 500] before passing to argv", async () => {
    const calls: Array<readonly string[]> = [];
    const exec: ExecShim = async (_f, args) => {
      calls.push(args);
      return { stdout: "ok", stderr: "" };
    };
    await captureTmuxPane("tmux", "s", "w", 0, exec);
    await captureTmuxPane("tmux", "s", "w", 9999, exec);
    expect(calls[0]).toContain("-1");
    expect(calls[1]).toContain("-500");
  });
});
