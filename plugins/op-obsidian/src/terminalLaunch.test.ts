import { describe, it, expect } from "vitest";
import {
  SHARED_TMUX_SESSION,
  buildITermAttachCommand,
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

describe("tmuxWindowName for entry-less launches", () => {
  it("sanitizes the workflow window form `op:workflow:<slug>` to dashes", () => {
    expect(tmuxWindowName("op:workflow:my-project")).toBe("op-workflow-my-project");
  });

  it("keeps the dash form `op-workflow-<slug>` intact", () => {
    expect(tmuxWindowName("op-workflow-my-project")).toBe("op-workflow-my-project");
  });
});

describe("tmuxWindowName migration regression (old inline chain vs slugify preset)", () => {
  // The original implementation was an inline regex chain:
  //   issueId.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "agent"
  // Verify that every stress input produces the exact same output after
  // migrating to slugify(issueId, { allowUnderscore: true, fallback: "agent" }).

  it("single dash → 'agent' (fallback fires)", () => {
    expect(tmuxWindowName("-")).toBe("agent");
  });

  it("multiple consecutive separators are collapsed, then trimmed → fallback", () => {
    expect(tmuxWindowName("---")).toBe("agent");
  });

  it("mixed-case, digits, underscore, and dash are preserved unchanged", () => {
    expect(tmuxWindowName("ABC_123-def")).toBe("ABC_123-def");
  });

  it("embedded `.` → `-`", () => {
    expect(tmuxWindowName("OP.37")).toBe("OP-37");
  });

  it("embedded `+` → `-`", () => {
    expect(tmuxWindowName("a+b")).toBe("a-b");
  });

  it("leading dashes are trimmed", () => {
    expect(tmuxWindowName("---hello")).toBe("hello");
  });

  it("trailing dashes are trimmed", () => {
    expect(tmuxWindowName("hello---")).toBe("hello");
  });

  it("very long input passes through without truncation (no maxLen in this preset)", () => {
    const long = "a".repeat(200);
    expect(tmuxWindowName(long)).toBe(long);
  });
});

describe("buildITermAttachCommand", () => {
  it("uses the supplied tmux binary and shell-quotes both args", () => {
    const out = buildITermAttachCommand("/opt/homebrew/bin/tmux", "op-agents");
    expect(out).toBe("'/opt/homebrew/bin/tmux' -CC attach -t 'op-agents'");
  });

  it("preserves shell metacharacters in the session name via single-quoting", () => {
    const out = buildITermAttachCommand("tmux", "op-agents$1");
    expect(out).toBe("'tmux' -CC attach -t 'op-agents$1'");
  });

  it("escapes embedded single quotes in the binary path", () => {
    const out = buildITermAttachCommand("/path/with'quote/tmux", "op-agents");
    expect(out).toBe(`'/path/with'\\''quote/tmux' -CC attach -t 'op-agents'`);
  });
});
