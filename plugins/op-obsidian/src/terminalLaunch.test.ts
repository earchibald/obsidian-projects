import { describe, it, expect } from "vitest";
import {
  SHARED_TMUX_SESSION,
  buildAgentExecCommand,
  buildITermAttachCommand,
  buildInnerScript,
  buildPrepScript,
  tmuxWindowName,
  type LaunchArgs,
} from "./terminalLaunch";

function makeArgs(overrides: Partial<LaunchArgs> = {}): LaunchArgs {
  return {
    cwd: "/repo",
    binary: "/usr/local/bin/claude",
    launchFlags: [],
    prompt: "do the thing",
    terminalApp: "iTerm",
    iTermPlacement: "new-tab",
    tmuxBinary: "/opt/homebrew/bin/tmux",
    agentId: "claude",
    ...overrides,
  };
}

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
      "'/opt/homebrew/bin/tmux' new-session -d -s 'op-agents' -c \"$HOME\" -n 'OP-39' bash '/tmp/op-agent-xyz/agent.command'",
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
      "'/opt/homebrew/bin/tmux' new-window -t 'op-agents' -c \"$HOME\" -n 'OP-39' bash '/tmp/op-agent-xyz/agent.command'",
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

describe("buildInnerScript — OSC 1337 SetUserVar=op_issue (OP-233)", () => {
  it("emits OSC 1337 SetUserVar with base64-encoded issue id when issueId is set", () => {
    const s = buildInnerScript({
      args: makeArgs({ issueId: "OP-233" }),
      promptPath: "/tmp/op-agent-xyz/prompt.txt",
    });
    // Buffer.from("OP-233", "utf8").toString("base64") === "T1AtMjMz"
    expect(s).toContain(
      `printf '\\033]1337;SetUserVar=op_issue=%s\\007' 'T1AtMjMz'`,
    );
  });

  it("encodes a different issue id correctly", () => {
    const s = buildInnerScript({
      args: makeArgs({ issueId: "TST-5" }),
      promptPath: "/tmp/op-agent-xyz/prompt.txt",
    });
    // Buffer.from("TST-5", "utf8").toString("base64") === "VFNULTU="
    expect(s).toContain(
      `printf '\\033]1337;SetUserVar=op_issue=%s\\007' 'VFNULTU='`,
    );
  });

  it("does not emit OSC 1337 when issueId is unset (entry-less launches stay untagged)", () => {
    const s = buildInnerScript({
      args: makeArgs({ issueId: undefined, windowName: "op-workflow-foo" }),
      promptPath: "/tmp/op-agent-xyz/prompt.txt",
    });
    expect(s).not.toContain("SetUserVar=op_issue");
    expect(s).not.toContain("\\033]1337");
  });

  it("places the OSC emit before exec'ing the agent binary", () => {
    const s = buildInnerScript({
      args: makeArgs({ issueId: "OP-233" }),
      promptPath: "/tmp/op-agent-xyz/prompt.txt",
    });
    const oscIdx = s.indexOf("SetUserVar=op_issue");
    const execIdx = s.indexOf("exec '/usr/local/bin/claude'");
    expect(oscIdx).toBeGreaterThan(0);
    expect(execIdx).toBeGreaterThan(oscIdx);
  });

  it("places the OSC emit before exec in debug mode too", () => {
    const s = buildInnerScript({
      args: makeArgs({ issueId: "OP-233", debug: true }),
      promptPath: "/tmp/op-agent-xyz/prompt.txt",
    });
    const oscIdx = s.indexOf("SetUserVar=op_issue");
    const execIdx = s.indexOf("exec '/usr/local/bin/claude'");
    expect(oscIdx).toBeGreaterThan(0);
    expect(execIdx).toBeGreaterThan(oscIdx);
  });

  it("uses copilot's -i form in the actual generated inner script", () => {
    const s = buildInnerScript({
      args: makeArgs({
        issueId: "OP-244",
        agentId: "copilot",
        binary: "/opt/homebrew/bin/copilot",
      }),
      promptPath: "/tmp/op-agent-xyz/prompt.txt",
    });
    expect(s).toContain(`exec '/opt/homebrew/bin/copilot' -i "$PROMPT"`);
    expect(s).not.toContain(`exec '/opt/homebrew/bin/copilot'  "$PROMPT"`);
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

describe("buildAgentExecCommand", () => {
  it("passes the prompt positionally for claude-style CLIs", () => {
    expect(buildAgentExecCommand({
      agentId: "claude",
      binary: "claude",
      launchFlags: ["--permission-mode", "auto"],
      promptRef: '"$PROMPT"',
    })).toBe("'claude' '--permission-mode' 'auto' \"$PROMPT\"");
  });

  it("uses copilot's interactive prompt flag", () => {
    expect(buildAgentExecCommand({
      agentId: "copilot",
      binary: "copilot",
      launchFlags: ["--model", "gpt-5"],
      promptRef: '"$PROMPT"',
    })).toBe("'copilot' '--model' 'gpt-5' -i \"$PROMPT\"");
  });

  it("omits prompt wiring in debug launches", () => {
    expect(buildAgentExecCommand({
      agentId: "copilot",
      binary: "copilot",
      launchFlags: [],
      promptRef: "",
    })).toBe("'copilot'");
  });
});
