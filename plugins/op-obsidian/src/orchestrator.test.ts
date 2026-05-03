import { describe, it, expect } from "vitest";

import {
  buildAgentInnerScript,
  buildViewScript,
  firstEmptyCell,
  labelWithId,
  labelWithParent,
  pruneDeadSessionSlots,
  type OrchestrateArgs,
} from "./orchestrator";
import type { RegistryData, WindowState } from "./layout/registry";

function makeReg(win: WindowState, surfaces: RegistryData["surfaces"] = {}): RegistryData {
  return {
    surfaces,
    windows: { [win.windowId]: win },
    windowOrder: [win.windowId],
  };
}

function makeOrchArgs(overrides: Partial<OrchestrateArgs> = {}): OrchestrateArgs {
  return {
    issueId: "OP-233",
    agentId: "claude",
    cwd: "/repo",
    binary: "/usr/local/bin/claude",
    launchFlags: [],
    prompt: "do the thing",
    tmuxBinary: "/opt/homebrew/bin/tmux",
    baseTmuxSession: "op-agents",
    ...overrides,
  };
}

describe("buildAgentInnerScript — OSC 1337 SetUserVar=op_issue (OP-233)", () => {
  it("emits OSC 1337 SetUserVar with base64-encoded issue id between env exports and exec", () => {
    const s = buildAgentInnerScript({
      args: makeOrchArgs({ issueId: "OP-233" }),
      promptPath: "/tmp/op-agent-xyz/prompt.txt",
    });
    expect(s).toContain(
      `printf '\\033]1337;SetUserVar=op_issue=%s\\007' 'T1AtMjMz'`,
    );
    const envIdx = s.indexOf("export OP_AGENT_ID=");
    const oscIdx = s.indexOf("SetUserVar=op_issue");
    const execIdx = s.indexOf("exec '/usr/local/bin/claude'");
    expect(oscIdx).toBeGreaterThan(envIdx);
    expect(execIdx).toBeGreaterThan(oscIdx);
  });

  it("emits OSC before the debug interactive shell exec too", () => {
    const s = buildAgentInnerScript({
      args: makeOrchArgs({ issueId: "TST-5", debug: true }),
      promptPath: "/tmp/op-agent-xyz/prompt.txt",
    });
    expect(s).toContain(
      `printf '\\033]1337;SetUserVar=op_issue=%s\\007' 'VFNULTU='`,
    );
    const oscIdx = s.indexOf("SetUserVar=op_issue");
    const execIdx = s.indexOf(`exec "$SHELL" -l`);
    expect(oscIdx).toBeGreaterThan(0);
    expect(execIdx).toBeGreaterThan(oscIdx);
  });

  it("uses copilot's interactive prompt flag in orchestrated launches", () => {
    const s = buildAgentInnerScript({
      args: makeOrchArgs({
        issueId: "OP-244",
        agentId: "copilot",
        binary: "/opt/homebrew/bin/copilot",
        launchFlags: ["--autopilot", "--allow-all"],
      }),
      promptPath: "/tmp/op-agent-xyz/prompt.txt",
    });
    expect(s).toContain(`exec '/opt/homebrew/bin/copilot' '--autopilot' '--allow-all' -i "$PROMPT"`);
    expect(s).not.toContain(`exec '/opt/homebrew/bin/copilot' '--autopilot' '--allow-all' "$PROMPT"`);
  });
});

describe("firstEmptyCell", () => {
  it("returns the lowest undefined index within the cell count", () => {
    expect(firstEmptyCell(["a", undefined, "c"], 3)).toBe(1);
    expect(firstEmptyCell(["a", "b"], 4)).toBe(2);
  });

  it("returns -1 when every slot is occupied", () => {
    expect(firstEmptyCell(["a", "b"], 2)).toBe(-1);
  });
});

describe("pruneDeadSessionSlots", () => {
  it("clears only dead slots and keeps alive ones", async () => {
    const win: WindowState = {
      windowId: "w1",
      layoutId: "1x2",
      sessionIds: ["alive", "dead"],
      tmuxSession: "op-agents-1",
    };
    const reg = makeReg(win, {
      "OP-A": { sessionId: "alive", windowId: "w1", cellIndex: 0, layoutId: "1x2", tmuxWindow: "OP-A" },
      "OP-B": { sessionId: "dead", windowId: "w1", cellIndex: 1, layoutId: "1x2", tmuxWindow: "OP-B" },
    });

    const anyAlive = await pruneDeadSessionSlots(reg, win, async (id) => id === "alive");

    expect(anyAlive).toBe(true);
    expect(win.sessionIds).toEqual(["alive", undefined]);
    expect(reg.surfaces).toEqual({
      "OP-A": { sessionId: "alive", windowId: "w1", cellIndex: 0, layoutId: "1x2", tmuxWindow: "OP-A" },
    });
  });

  it("compacts alive sessions to the front when cell 0 is dead", async () => {
    const win: WindowState = {
      windowId: "w1",
      layoutId: "2x2",
      sessionIds: ["dead", undefined, "alive", undefined],
      tmuxSession: "op-agents-1",
    };
    const reg = makeReg(win, {
      "OP-A": { sessionId: "dead", windowId: "w1", cellIndex: 0, layoutId: "2x2", tmuxWindow: "OP-A" },
      "OP-B": { sessionId: "alive", windowId: "w1", cellIndex: 2, layoutId: "2x2", tmuxWindow: "OP-B" },
    });

    const anyAlive = await pruneDeadSessionSlots(reg, win, async (id) => id === "alive");

    expect(anyAlive).toBe(true);
    expect(win.sessionIds).toEqual(["alive", undefined, undefined, undefined]);
    expect(reg.surfaces["OP-B"].cellIndex).toBe(0);
    expect(reg.surfaces["OP-A"]).toBeUndefined();
  });

  it("reports no-alive when every slot is dead", async () => {
    const win: WindowState = {
      windowId: "w1",
      layoutId: "1x2",
      sessionIds: ["d1", "d2"],
      tmuxSession: "op-agents-1",
    };
    const reg = makeReg(win);

    const anyAlive = await pruneDeadSessionSlots(reg, win, async () => false);

    expect(anyAlive).toBe(false);
    expect(win.sessionIds).toEqual([undefined, undefined]);
  });

  it("leaves undefined slots alone", async () => {
    const win: WindowState = {
      windowId: "w1",
      layoutId: "2x2",
      sessionIds: ["alive", undefined, undefined, undefined],
      tmuxSession: "op-agents-1",
    };
    const reg = makeReg(win);

    const anyAlive = await pruneDeadSessionSlots(reg, win, async () => true);

    expect(anyAlive).toBe(true);
    expect(win.sessionIds).toEqual(["alive", undefined, undefined, undefined]);
  });
});

describe("buildViewScript", () => {
  const baseArgs = {
    tmuxBinary: "/opt/homebrew/bin/tmux",
    tmuxSession: "op-agents-1",
    tmuxWindow: "OP-172",
    issueId: "OP-172",
    issueTitle: "research - can we actually name iterm2 tmux windows",
  };

  it("emits OSC 1 (tab/icon name) with `<id> <title>` before exec", () => {
    const out = buildViewScript(baseArgs);
    expect(out).toContain(
      `printf '\\033]1;%s\\007' 'OP-172 research - can we actually name iterm2 tmux windows'`,
    );
    const oscIdx = out.indexOf(`printf '\\033]1;`);
    const execIdx = out.indexOf("exec");
    expect(oscIdx).toBeGreaterThan(-1);
    expect(execIdx).toBeGreaterThan(oscIdx);
  });

  it("emits OSC 2 (window title) with `<id> <title>` when title present", () => {
    const out = buildViewScript(baseArgs);
    expect(out).toContain(
      `printf '\\033]2;%s\\007' 'OP-172 research - can we actually name iterm2 tmux windows'`,
    );
  });

  it("falls back to bare issueId for both OSC 1 and OSC 2 when issueTitle is empty", () => {
    const out = buildViewScript({ ...baseArgs, issueTitle: "" });
    expect(out).toContain(`printf '\\033]1;%s\\007' 'OP-172'`);
    expect(out).toContain(`printf '\\033]2;%s\\007' 'OP-172'`);
  });

  it("falls back to bare issueId for both OSC 1 and OSC 2 when issueTitle is missing", () => {
    const { issueTitle, ...rest } = baseArgs;
    const out = buildViewScript(rest);
    expect(out).toContain(`printf '\\033]1;%s\\007' 'OP-172'`);
    expect(out).toContain(`printf '\\033]2;%s\\007' 'OP-172'`);
  });

  it("does not double-prefix when issueTitle already starts with the issueId (basename fallback)", () => {
    const out = buildViewScript({
      ...baseArgs,
      issueTitle: "OP-172 research - can we actually name iterm2 tmux windows",
    });
    expect(out).toContain(
      `printf '\\033]1;%s\\007' 'OP-172 research - can we actually name iterm2 tmux windows'`,
    );
    expect(out).not.toContain("OP-172 OP-172");
  });

  it("does not enable tmux set-titles forwarding (OP-103 regression guard)", () => {
    const out = buildViewScript(baseArgs);
    expect(out).not.toContain("set-titles on");
    expect(out).not.toContain("set-titles-string");
  });

  it("strips control characters (ESC, BEL) from issueTitle in OSC 2 payload", () => {
    const out = buildViewScript({
      ...baseArgs,
      issueTitle: "evil\x1b]0;injected\x07title",
    });
    // Control chars stripped → only safe text survives in the (combined) payload
    expect(out).toContain(
      `printf '\\033]2;%s\\007' 'OP-172 evil]0;injectedtitle'`,
    );
  });

  it("does not double-prefix when issueTitle has a control char between id and separator (dedup bypass guard)", () => {
    // BEL injected between the id and the space would have bypassed the old
    // startsWith check before oscSafe was moved before labelWithId.
    const out = buildViewScript({
      ...baseArgs,
      issueTitle: "OP-172\x07 research - can we actually name iterm2 tmux windows",
    });
    // After oscSafe strips \x07 the title becomes "OP-172 research …" which
    // starts with the id — dedup fires and no double-prefix is emitted.
    expect(out).toContain(
      `printf '\\033]1;%s\\007' 'OP-172 research - can we actually name iterm2 tmux windows'`,
    );
    expect(out).not.toContain("OP-172 OP-172");
  });

  it("strips control characters (ESC, BEL) from issueId in OSC 1 payload", () => {
    const out = buildViewScript({
      ...baseArgs,
      issueId: "OP\x1b-172",
    });
    expect(out).toContain(
      `printf '\\033]1;%s\\007' 'OP-172 research - can we actually name iterm2 tmux windows'`,
    );
  });

  it("creates the per-pane grouped session and attaches with select-window", () => {
    const out = buildViewScript(baseArgs);
    expect(out).toContain(
      `'/opt/homebrew/bin/tmux' new-session -d -s 'view-OP-172' -c "$HOME" -t 'op-agents-1' 2>/dev/null || true`,
    );
    expect(out).toContain(
      `exec '/opt/homebrew/bin/tmux' attach -t 'view-OP-172' \\; select-window -t 'view-OP-172':'OP-172'`,
    );
  });

  // OP-178: the per-pane view session inherits the parent op-agents-N
  // session's window list, so the agent's `/quit` would otherwise leave the
  // iTerm pane attached and silently switched to a sibling agent's window.
  // The hook kills the view session when the agent's specific window is
  // unlinked, so the iTerm pane closes cleanly.
  it("installs a window-unlinked hook on the view session that kills it when the agent's window dies", () => {
    const out = buildViewScript(baseArgs);
    expect(out).toContain(
      `'/opt/homebrew/bin/tmux' set-hook -t '=view-OP-172' window-unlinked 'if-shell -F '\\''#{==:#{hook_window_name},OP-172}'\\'' '\\''kill-session -t =view-OP-172'\\'''`,
    );
  });

  it("installs the hook after new-session and before exec attach, with race guard in between", () => {
    const out = buildViewScript(baseArgs);
    const newSessionIdx = out.indexOf("new-session -d -s 'view-OP-172'");
    const hookIdx = out.indexOf("set-hook -t '=view-OP-172'");
    const raceGuardIdx = out.indexOf("select-window -t '=view-OP-172':'OP-172'");
    const execIdx = out.indexOf("exec '/opt/homebrew/bin/tmux' attach");
    expect(newSessionIdx).toBeGreaterThan(-1);
    expect(hookIdx).toBeGreaterThan(newSessionIdx);
    expect(raceGuardIdx).toBeGreaterThan(hookIdx);
    expect(execIdx).toBeGreaterThan(raceGuardIdx);
  });

  // OP-178 race guard: agent window dies between new-session and set-hook
  // while sibling windows keep the session alive. The hook is installed but
  // will never fire (window already gone), so we kill the session immediately.
  it("emits a race guard that kills the view session when the agent window is already gone", () => {
    const out = buildViewScript(baseArgs);
    expect(out).toContain(
      `'/opt/homebrew/bin/tmux' select-window -t '=view-OP-172':'OP-172' 2>/dev/null || { '/opt/homebrew/bin/tmux' kill-session -t '=view-OP-172' 2>/dev/null || true; }`,
    );
  });

  it("scopes the hook to the agent's specific window name so sibling deaths leave this view alone", () => {
    const out = buildViewScript({ ...baseArgs, issueId: "OP-178", tmuxWindow: "OP-178" });
    // The format predicate compares the unlinked window's name to *this*
    // pane's agent window — siblings unlinking on the shared window list
    // won't match and the if-shell branch won't fire.
    expect(out).toContain(`#{==:#{hook_window_name},OP-178}`);
    expect(out).toContain(`kill-session -t =view-OP-178`);
  });
});

describe("labelWithId", () => {
  it("prefixes the title with the issueId", () => {
    expect(labelWithId("OP-177", "iterm tmux windows…")).toBe("OP-177 iterm tmux windows…");
  });

  it("returns bare issueId when title is empty/missing", () => {
    expect(labelWithId("OP-177", "")).toBe("OP-177");
    expect(labelWithId("OP-177", undefined)).toBe("OP-177");
  });

  it("does not double-prefix when title already starts with `<id> `", () => {
    expect(labelWithId("OP-177", "OP-177 iterm tmux windows…")).toBe(
      "OP-177 iterm tmux windows…",
    );
  });

  it("does not double-prefix when title starts with `<id>:` (colon separator)", () => {
    expect(labelWithId("OP-177", "OP-177: iterm tmux windows…")).toBe(
      "OP-177: iterm tmux windows…",
    );
  });

  it("does not double-prefix when title starts with `<id> -` (dash separator)", () => {
    expect(labelWithId("OP-177", "OP-177 - iterm tmux windows…")).toBe(
      "OP-177 - iterm tmux windows…",
    );
  });

  it("returns the title as-is when it equals the issueId", () => {
    expect(labelWithId("OP-177", "OP-177")).toBe("OP-177");
  });
});

describe("labelWithParent", () => {
  it("appends ` [Parent: <PARENT-ID>]` to the label when parentId is set", () => {
    expect(labelWithParent("OP-179 add parent suffix", "OP-149")).toBe(
      "OP-179 add parent suffix [Parent: OP-149]",
    );
  });

  it("returns the label unchanged when parentId is undefined", () => {
    expect(labelWithParent("OP-179 add parent suffix", undefined)).toBe(
      "OP-179 add parent suffix",
    );
  });

  it("returns the label unchanged when parentId is empty", () => {
    expect(labelWithParent("OP-179 add parent suffix", "")).toBe(
      "OP-179 add parent suffix",
    );
  });

  it("composes cleanly with labelWithId for the bare-id fallback case", () => {
    // Title-less launch: labelWithId(id, undefined) returns the bare id, then
    // labelWithParent appends the suffix.
    expect(labelWithParent(labelWithId("OP-179", undefined), "OP-149")).toBe(
      "OP-179 [Parent: OP-149]",
    );
  });

  it("returns the label unchanged when parentId is whitespace-only", () => {
    // `str()` accepts "   " (length > 0) but `labelWithParent` trims it,
    // consistent with `readParentId`'s `raw.trim().length > 0` guard.
    expect(labelWithParent("OP-179 add parent suffix", "   ")).toBe(
      "OP-179 add parent suffix",
    );
  });

  it("trims surrounding whitespace from parentId before appending", () => {
    // Leading/trailing whitespace on the parentId value is stripped.
    expect(labelWithParent("OP-179 add parent suffix", "  OP-149  ")).toBe(
      "OP-179 add parent suffix [Parent: OP-149]",
    );
  });

  it("appends the suffix when parentId equals the issueId (self-link; upstream op-set-link rejects this)", () => {
    // `labelWithParent` has no self-link awareness — that guard lives in
    // `validateLinkArgs` which throws "Cannot link issue to itself: …" before
    // the parent can be persisted.  This test documents the pass-through for
    // completeness (a manually-edited frontmatter could still reach here).
    expect(labelWithParent("OP-179 title", "OP-179")).toBe(
      "OP-179 title [Parent: OP-179]",
    );
  });
});

describe("buildViewScript with parentId", () => {
  const baseArgs = {
    tmuxBinary: "/opt/homebrew/bin/tmux",
    tmuxSession: "op-agents-1",
    tmuxWindow: "OP-179",
    issueId: "OP-179",
    issueTitle: "iTerm tab title: append parent suffix",
  };

  it("appends `[Parent: <PARENT-ID>]` to the OSC 1 (tab/icon) payload when parentId is set", () => {
    const out = buildViewScript({ ...baseArgs, parentId: "OP-149" });
    expect(out).toContain(
      `printf '\\033]1;%s\\007' 'OP-179 iTerm tab title: append parent suffix [Parent: OP-149]'`,
    );
  });

  it("appends `[Parent: <PARENT-ID>]` to the OSC 2 (window title) payload when parentId is set", () => {
    const out = buildViewScript({ ...baseArgs, parentId: "OP-149" });
    expect(out).toContain(
      `printf '\\033]2;%s\\007' 'OP-179 iTerm tab title: append parent suffix [Parent: OP-149]'`,
    );
  });

  it("omits the parent suffix when parentId is undefined (no breaking change for non-child issues)", () => {
    const out = buildViewScript(baseArgs);
    expect(out).toContain(
      `printf '\\033]1;%s\\007' 'OP-179 iTerm tab title: append parent suffix'`,
    );
    expect(out).not.toContain("[Parent:");
  });

  it("omits the parent suffix when parentId is empty", () => {
    const out = buildViewScript({ ...baseArgs, parentId: "" });
    expect(out).not.toContain("[Parent:");
  });

  it("strips control characters from parentId before the suffix is composed", () => {
    const out = buildViewScript({ ...baseArgs, parentId: "OP\x1b-149\x07" });
    expect(out).toContain(
      `printf '\\033]2;%s\\007' 'OP-179 iTerm tab title: append parent suffix [Parent: OP-149]'`,
    );
  });

  it("appends the parent suffix even with the bare-id fallback (no title)", () => {
    const { issueTitle, ...rest } = baseArgs;
    const out = buildViewScript({ ...rest, parentId: "OP-149" });
    expect(out).toContain(`printf '\\033]1;%s\\007' 'OP-179 [Parent: OP-149]'`);
    expect(out).toContain(`printf '\\033]2;%s\\007' 'OP-179 [Parent: OP-149]'`);
  });

  it("handles tmux-special char `:` in parentId via shSingleQuote escaping", () => {
    // `:` is the tmux session:window separator but is safe inside single quotes.
    const out = buildViewScript({ ...baseArgs, parentId: "OP:149" });
    expect(out).toContain(`[Parent: OP:149]`);
    // The whole label is enclosed in single quotes; `:` needs no escaping.
    expect(out).toContain(`printf '\\033]1;%s\\007' 'OP-179 iTerm tab title: append parent suffix [Parent: OP:149]'`);
  });

  it("handles single quote in parentId via shSingleQuote escaping", () => {
    // `shSingleQuote` replaces ' with '\'' so injected single quotes are escaped.
    const out = buildViewScript({ ...baseArgs, parentId: "OP'149" });
    // The label string is single-quote-escaped; the parentId apostrophe gets '\''
    expect(out).toContain(`[Parent: OP'\\''149]`);
    // No raw unescaped ' adjacent to the %s argument
    expect(out).not.toMatch(/printf '\\033]1;%s\\007' '[^']*OP'149/);
  });

  it("OP-178 hook coexists in the same script when parentId is set", () => {
    // The window-unlinked hook uses tmuxWindow (not the label), so the parent
    // suffix has no effect on the hook predicate — both OSC payload and hook
    // must appear together.
    const out = buildViewScript({ ...baseArgs, parentId: "OP-149" });
    expect(out).toContain(`[Parent: OP-149]`);
    expect(out).toContain(`#{==:#{hook_window_name},OP-179}`);
    expect(out).toContain(`kill-session -t =view-OP-179`);
  });
});
