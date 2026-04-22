import { describe, it, expect } from "vitest";
import {
  SHARED_TMUX_SESSION,
  buildITermOsascript,
  buildPrepScript,
  tmuxWindowName,
} from "./terminalLaunch";

describe("SHARED_TMUX_SESSION", () => {
  it("is the fixed session name op-agents", () => {
    expect(SHARED_TMUX_SESSION).toBe("op-agents");
  });
});

describe("tmuxWindowName", () => {
  it("keeps the issue id intact when already safe", () => {
    expect(tmuxWindowName("OP-37")).toBe("OP-37");
  });

  it("replaces tmux-unsafe chars (dots, colons, spaces)", () => {
    expect(tmuxWindowName("OP.37:1 x")).toBe("OP-37-1-x");
  });

  it("falls back to 'agent' on empty input", () => {
    expect(tmuxWindowName("...")).toBe("agent");
  });
});

describe("buildPrepScript", () => {
  const base = {
    tmuxBinary: "/opt/homebrew/bin/tmux",
    session: "op-agents",
    windowName: "OP-39",
    innerPath: "/tmp/op-agent-xyz/agent.command",
  };

  it("creates a detached session if none exists", () => {
    const s = buildPrepScript(base);
    expect(s).toContain(
      "'/opt/homebrew/bin/tmux' has-session -t 'op-agents'",
    );
    expect(s).toContain(
      "'/opt/homebrew/bin/tmux' new-session -d -s 'op-agents' -n 'OP-39' bash '/tmp/op-agent-xyz/agent.command'",
    );
  });

  it("selects an existing window by exact name (grep -Fxq, not substring)", () => {
    const s = buildPrepScript(base);
    expect(s).toContain("grep -Fxq 'OP-39'");
    expect(s).toContain("select-window -t 'op-agents':'OP-39'");
  });

  it("creates a new window when the session exists but the window does not", () => {
    const s = buildPrepScript(base);
    expect(s).toContain(
      "'/opt/homebrew/bin/tmux' new-window -t 'op-agents' -n 'OP-39' bash '/tmp/op-agent-xyz/agent.command'",
    );
  });
});

describe("buildITermOsascript", () => {
  it("new-window variant always creates a new window and attaches via -CC", () => {
    const out = buildITermOsascript("new-window", "op-agents");
    expect(out).toContain("create window with default profile command");
    expect(out).not.toContain("if (count of windows)");
    expect(out).toContain("-CC attach -t 'op-agents'");
    expect(out).toContain("'tmux'");
  });

  it("honors a custom tmux binary path", () => {
    const out = buildITermOsascript("new-window", "op-agents", "/opt/homebrew/bin/tmux");
    expect(out).toContain("'/opt/homebrew/bin/tmux' -CC attach -t 'op-agents'");
  });

  it("new-tab variant falls back to new window if none open", () => {
    const out = buildITermOsascript("new-tab", "op-agents");
    expect(out).toContain("if (count of windows) = 0 then");
    expect(out).toContain("create tab with default profile command");
    expect(out).toContain("activate");
  });

  it("escapes embedded double quotes in the command string", () => {
    const out = buildITermOsascript("new-window", 'op-"danger"');
    expect(out).toContain('\\"danger\\"');
  });
});
