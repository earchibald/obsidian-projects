import { describe, it, expect } from "vitest";
import { buildITermOsascript, tmuxSessionName } from "./terminalLaunch";

describe("tmuxSessionName", () => {
  it("prefixes op- and keeps issue id intact", () => {
    expect(tmuxSessionName("OP-37")).toBe("op-OP-37");
  });

  it("replaces tmux-unsafe chars (dots, colons, spaces)", () => {
    expect(tmuxSessionName("OP.37:1 x")).toBe("op-OP-37-1-x");
  });

  it("falls back to op-agent on empty input", () => {
    expect(tmuxSessionName("...")).toBe("op-agent");
  });
});

describe("buildITermOsascript", () => {
  const script = "/tmp/op-agent-xyz/agent.command";

  it("new-window variant always creates a new window", () => {
    const out = buildITermOsascript("new-window", "op-OP-37", script);
    expect(out).toContain("create window with default profile command");
    expect(out).not.toContain("if (count of windows)");
    expect(out).toContain("tmux -CC new-session -A -s 'op-OP-37'");
    expect(out).toContain(`'bash ${script}'`);
  });

  it("new-tab variant falls back to new window if none open", () => {
    const out = buildITermOsascript("new-tab", "op-OP-37", script);
    expect(out).toContain("if (count of windows) = 0 then");
    expect(out).toContain("create tab with default profile command");
    expect(out).toContain("activate");
  });

  it("escapes embedded double quotes in the command string", () => {
    const out = buildITermOsascript("new-window", 'op-"danger"', script);
    expect(out).toContain('\\"danger\\"');
  });
});
