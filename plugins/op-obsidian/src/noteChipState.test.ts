import { describe, expect, it } from "vitest";
import {
  chipPrimaryCommandForClick,
  describeChipPrimaryAction,
  isIssueFrontmatter,
  resolveChipState,
} from "./noteChipState";

describe("isIssueFrontmatter", () => {
  it("rejects notes without type=issue", () => {
    expect(isIssueFrontmatter({ id: "OP-1", type: "task" })).toBe(false);
    expect(isIssueFrontmatter({ id: "OP-1" })).toBe(false);
  });

  it("rejects malformed ids (TASKS notes use OP-100.1 style — must be filtered)", () => {
    expect(isIssueFrontmatter({ id: "OP-100.1", type: "issue" })).toBe(false);
    expect(isIssueFrontmatter({ id: "op-1", type: "issue" })).toBe(false);
    expect(isIssueFrontmatter({ id: "OP1", type: "issue" })).toBe(false);
  });

  it("accepts canonical issue ids", () => {
    expect(isIssueFrontmatter({ id: "OP-1", type: "issue" })).toBe(true);
    expect(isIssueFrontmatter({ id: "ABC-9999", type: "issue" })).toBe(true);
  });

  it("rejects null/undefined", () => {
    expect(isIssueFrontmatter(undefined)).toBe(false);
    expect(isIssueFrontmatter(null)).toBe(false);
  });
});

describe("resolveChipState — every row of the chip-state matrix", () => {
  it("open / no agent → Start agent + standard overflow", () => {
    const state = resolveChipState(
      { id: "OP-1", type: "issue", status: "open" },
      true,
    );
    expect(state?.action).toBe("start-agent");
    expect(state?.primaryLabel).toBe("▶ Start agent");
    expect(state?.primaryCommand).toBe("op-open-agent");
    expect(state?.variant).toBe("primary");
    expect(state?.menu.map((m) => m.key)).toEqual([
      "set-priority",
      "edit-scope",
      "resolve-wontfix",
    ]);
  });

  it("start-agent hover text names the configured default agent and pick hint", () => {
    const state = resolveChipState(
      { id: "OP-1", type: "issue", status: "open" },
      true,
    );
    expect(state).not.toBeNull();
    expect(describeChipPrimaryAction(state!, "copilot")).toBe(
      "▶ Start agent (default: copilot; Cmd/Ctrl-click to pick agent)",
    );
  });

  it("plain click on Start agent keeps the default-agent launch command", () => {
    const state = resolveChipState(
      { id: "OP-1", type: "issue", status: "open" },
      true,
    );
    expect(state).not.toBeNull();
    expect(chipPrimaryCommandForClick(state!, {})).toBe("op-open-agent");
  });

  it("Cmd/Ctrl-click on Start agent routes through the picker command", () => {
    const state = resolveChipState(
      { id: "OP-1", type: "issue", status: "open" },
      true,
    );
    expect(state).not.toBeNull();
    expect(chipPrimaryCommandForClick(state!, { metaKey: true })).toBe("op-open-agent-pick");
    expect(chipPrimaryCommandForClick(state!, { ctrlKey: true })).toBe("op-open-agent-pick");
  });

  it("open / agent set / not live → Re-attach (stale variant)", () => {
    const state = resolveChipState(
      { id: "OP-2", type: "issue", status: "open", agent: "claude" },
      false,
    );
    expect(state?.action).toBe("reattach-fresh");
    expect(state?.primaryLabel).toBe("↻ Re-attach (start fresh)");
    expect(state?.variant).toBe("stale");
    expect(state?.menu.map((m) => m.key)).toEqual(["clear-stale-agent", "resolve"]);
  });

  it("in-progress / agent alive → Attach session", () => {
    const state = resolveChipState(
      { id: "OP-3", type: "issue", status: "in-progress", agent: "claude" },
      true,
    );
    expect(state?.action).toBe("attach-session");
    expect(state?.primaryLabel).toBe("▶ Attach session");
    expect(state?.primaryCommand).toBe("op-attach-current");
    expect(state?.menu.map((m) => m.key)).toEqual(["append-commit", "set-pr", "resolve"]);
  });

  it("modified click does not rewrite non-start-agent chip commands", () => {
    const state = resolveChipState(
      { id: "OP-3", type: "issue", status: "in-progress", agent: "claude" },
      true,
    );
    expect(state).not.toBeNull();
    expect(chipPrimaryCommandForClick(state!, { metaKey: true })).toBe("op-attach-current");
    expect(describeChipPrimaryAction(state!, "copilot")).toBe("▶ Attach session");
  });

  it("in-progress / agent set / not live → Re-attach (stale)", () => {
    const state = resolveChipState(
      { id: "OP-4", type: "issue", status: "in-progress", agent: "claude" },
      false,
    );
    expect(state?.action).toBe("reattach-fresh");
    expect(state?.variant).toBe("stale");
  });

  it("in-progress / no agent → Start agent + in-progress overflow", () => {
    const state = resolveChipState(
      { id: "OP-5", type: "issue", status: "in-progress" },
      true,
    );
    expect(state?.action).toBe("start-agent");
    expect(state?.menu.map((m) => m.key)).toEqual(["append-commit", "set-pr", "resolve"]);
  });

  it("resolved with github_issue → Reopen + GH link in overflow", () => {
    const state = resolveChipState(
      {
        id: "OP-6",
        type: "issue",
        status: "resolved",
        githubIssue: "https://github.com/x/y/issues/1",
      },
      true,
    );
    expect(state?.action).toBe("reopen");
    expect(state?.primaryLabel).toBe("↺ Reopen");
    expect(state?.variant).toBe("reopen");
    expect(state?.menu.map((m) => m.key)).toEqual(["open-github-issue"]);
  });

  it("wontfix without github_issue → Reopen + empty overflow", () => {
    const state = resolveChipState(
      { id: "OP-7", type: "issue", status: "wontfix" },
      true,
    );
    expect(state?.action).toBe("reopen");
    expect(state?.menu).toEqual([]);
  });

  it("isAgentLive is irrelevant when status is resolved", () => {
    const live = resolveChipState(
      { id: "OP-8", type: "issue", status: "resolved", agent: "claude" },
      true,
    );
    const dead = resolveChipState(
      { id: "OP-8", type: "issue", status: "resolved", agent: "claude" },
      false,
    );
    expect(live?.action).toBe("reopen");
    expect(dead?.action).toBe("reopen");
  });

  it("returns null for non-issue notes (the type-gate)", () => {
    expect(
      resolveChipState({ id: "OP-1", type: "task", status: "open" } as any, true),
    ).toBeNull();
  });

  it("returns null for malformed ids (TASKS-shaped)", () => {
    expect(
      resolveChipState({ id: "OP-100.1", type: "issue", status: "open" }, true),
    ).toBeNull();
  });

  it("returns null when status is missing or unknown", () => {
    expect(resolveChipState({ id: "OP-1", type: "issue" }, true)).toBeNull();
    expect(
      resolveChipState({ id: "OP-1", type: "issue", status: "draft" }, true),
    ).toBeNull();
  });

  it("agent: '' (empty string) is treated as no agent", () => {
    const state = resolveChipState(
      { id: "OP-9", type: "issue", status: "open", agent: "" },
      false,
    );
    expect(state?.action).toBe("start-agent");
    expect(state?.storedAgent).toBeUndefined();
  });

  it("storedAgent is surfaced from frontmatter agent field", () => {
    const state = resolveChipState(
      { id: "OP-10", type: "issue", status: "in-progress", agent: "claude" },
      true,
    );
    expect(state?.storedAgent).toBe("claude");
  });

  it("OP-256: tooltip honours storedAgent over the settings default (option B)", () => {
    const state = resolveChipState(
      { id: "OP-11", type: "issue", status: "open", agent: "claude" },
      false,
    );
    // re-attach state — not start-agent, so the standard label
    expect(state?.action).toBe("reattach-fresh");
    // For start-agent specifically, build a fresh state with no stored agent:
    const start = resolveChipState({ id: "OP-12", type: "issue", status: "open" }, true);
    expect(describeChipPrimaryAction(start!, "copilot")).toBe(
      "▶ Start agent (default: copilot; Cmd/Ctrl-click to pick agent)",
    );
    // And one with a stored agent (in-progress without live tmux session):
    const stored = resolveChipState(
      { id: "OP-13", type: "issue", status: "in-progress" },
      true,
    );
    // OP-13 has no stored agent, so this case still falls back to defaultAgent.
    // To exercise stored-agent tooltip routing we manually craft the state
    // because no current row produces a start-agent ChipState carrying a
    // stored agent (start-agent only fires when hasAgent is false). The
    // tooltip routing is still useful as defensive code: if a future row
    // carries both, the tooltip MUST show the stored agent.
    expect(
      describeChipPrimaryAction(
        { ...stored!, action: "start-agent", storedAgent: "gemini" },
        "copilot",
      ),
    ).toBe("▶ Start agent (default: gemini; Cmd/Ctrl-click to pick agent)");
  });

  it("primaryCommand is always a bare id — no op-obsidian: prefix (dispatch contract)", () => {
    // The chip-state matrix intentionally authors bare ids; `prefixedCommandId`
    // is applied at dispatch time. If a future refactor flips the matrix to
    // pre-prefix, this test fails loudly before the double-prefix reaches prod.
    const cases = [
      resolveChipState({ id: "OP-1", type: "issue", status: "open" }, true),
      resolveChipState({ id: "OP-2", type: "issue", status: "open", agent: "claude" }, true),
      resolveChipState({ id: "OP-3", type: "issue", status: "in-progress", agent: "claude" }, true),
      resolveChipState({ id: "OP-4", type: "issue", status: "resolved" }, true),
    ];
    for (const state of cases) {
      if (state?.primaryCommand) {
        expect(state.primaryCommand).not.toContain(":");
      }
    }
  });
});
