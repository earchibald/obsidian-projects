import { describe, it, expect } from "vitest";
import {
  CLAUDE_SESSION_COLORS,
  DEFAULT_SETTINGS,
  mergeSettings,
  matchSettingRow,
  sanitizeSessionDecorationPalette,
} from "./settingsPure";
import { emptyRegistry, mergeRegistry, type RegistryData } from "./layout/registry";

describe("mergeSettings", () => {
  it("returns a deep clone of DEFAULT_SETTINGS for null/non-object input", () => {
    for (const input of [null, undefined, 42, "str", true]) {
      const out = mergeSettings(input as unknown);
      expect(out).toEqual(DEFAULT_SETTINGS);
      // no shared refs
      expect(out).not.toBe(DEFAULT_SETTINGS);
      expect(out.injection).not.toBe(DEFAULT_SETTINGS.injection);
      expect(out.view).not.toBe(DEFAULT_SETTINGS.view);
      expect(out.github).not.toBe(DEFAULT_SETTINGS.github);
      expect(out.agents).not.toBe(DEFAULT_SETTINGS.agents);
      expect(out.developer).not.toBe(DEFAULT_SETTINGS.developer);
      expect(out.flow).not.toBe(DEFAULT_SETTINGS.flow);
      expect(out.orchestrator).not.toBe(DEFAULT_SETTINGS.orchestrator);
      expect(out.workingDirs).not.toBe(DEFAULT_SETTINGS.workingDirs);
    }
  });

  it("rejects unknown defaultAgent and accepts valid ones", () => {
    expect(mergeSettings({ defaultAgent: "bogus" }).defaultAgent).toBe(DEFAULT_SETTINGS.defaultAgent);
    expect(mergeSettings({ defaultAgent: "gemini" }).defaultAgent).toBe("gemini");
    expect(mergeSettings({ defaultAgent: "copilot" }).defaultAgent).toBe("copilot");
  });

  it("merges partial injection/github/agents without overwriting untouched defaults", () => {
    const out = mergeSettings({
      injection: { maxBodyChars: 1234 },
      github: { autoCreateGithubIssue: true },
      agents: { enforceWorktree: true },
    });
    expect(out.injection.maxBodyChars).toBe(1234);
    expect(out.injection.injectBody).toBe(DEFAULT_SETTINGS.injection.injectBody);
    expect(out.injection.extraPreamble).toBe(DEFAULT_SETTINGS.injection.extraPreamble);
    // OP-197: maxWorkflowChars default raised to 50000 — caller didn't supply
    // an override, so the merged value matches the (new) default.
    expect(out.injection.maxWorkflowChars).toBe(50000);
    expect(out.github.autoCreateGithubIssue).toBe(true);
    expect(out.github.closeGithubIssueOnResolve).toBe(DEFAULT_SETTINGS.github.closeGithubIssueOnResolve);
    expect(out.agents.enforceWorktree).toBe(true);
  });

  it("OP-197: maxWorkflowChars default is 50000 but explicit user values pass through unchanged", () => {
    // Fresh install: no value saved, sees the new default.
    expect(mergeSettings({}).injection.maxWorkflowChars).toBe(50000);
    // Existing install: user explicitly saved the old default; mergeSettings
    // preserves their value (no surprise upgrade).
    expect(mergeSettings({ injection: { maxWorkflowChars: 2000 } }).injection.maxWorkflowChars).toBe(2000);
    // User saved a custom value: also preserved.
    expect(mergeSettings({ injection: { maxWorkflowChars: 12345 } }).injection.maxWorkflowChars).toBe(12345);
  });

  it("flow settings default to off / 10min, accept partial overrides", () => {
    expect(mergeSettings({}).flow).toEqual(DEFAULT_SETTINGS.flow);
    const out = mergeSettings({
      flow: { autoAdvance: true, headlessTimeoutMs: 30_000 },
    });
    expect(out.flow.autoAdvance).toBe(true);
    expect(out.flow.headlessTimeoutMs).toBe(30_000);
    expect(out.flow.autoMerge).toBe(DEFAULT_SETTINGS.flow.autoMerge);
  });

  it("session decoration defaults, sanitizes palette entries, and keeps full replacement semantics", () => {
    const out = mergeSettings({
      sessionDecoration: {
        autoColor: false,
        palette: ["RED", "blue", "blue", "bogus"],
      },
    });
    expect(out.sessionDecoration.autoColor).toBe(false);
    expect(out.sessionDecoration.autoRename).toBe(DEFAULT_SETTINGS.sessionDecoration.autoRename);
    expect(out.sessionDecoration.palette).toEqual(["red", "blue"]);
  });

  it("session decoration falls back to defaults for blank template / invalid palette / invalid delay", () => {
    const out = mergeSettings({
      sessionDecoration: {
        palette: ["bogus"],
        nameTemplate: "   ",
        interCommandDelayMs: -1,
      },
    });
    expect(out.sessionDecoration.palette).toEqual(DEFAULT_SETTINGS.sessionDecoration.palette);
    expect(out.sessionDecoration.nameTemplate).toBe(DEFAULT_SETTINGS.sessionDecoration.nameTemplate);
    expect(out.sessionDecoration.interCommandDelayMs).toBe(
      DEFAULT_SETTINGS.sessionDecoration.interCommandDelayMs,
    );
  });

  it("rejects invalid flow.headlessTimeoutMs (non-positive / non-numeric)", () => {
    for (const bad of [0, -1, "300" as unknown as number, NaN]) {
      const out = mergeSettings({ flow: { headlessTimeoutMs: bad } });
      expect(out.flow.headlessTimeoutMs).toBe(DEFAULT_SETTINGS.flow.headlessTimeoutMs);
    }
  });

  it("copies workingDirs into a fresh object", () => {
    const input = { workingDirs: { foo: "/a", bar: "/b" } };
    const out = mergeSettings(input);
    expect(out.workingDirs).toEqual({ foo: "/a", bar: "/b" });
    expect(out.workingDirs).not.toBe(input.workingDirs);
  });

  it("trims tmuxBinary; rejects empty/whitespace", () => {
    expect(mergeSettings({ tmuxBinary: "  /opt/tmux  " }).tmuxBinary).toBe("/opt/tmux");
    expect(mergeSettings({ tmuxBinary: "" }).tmuxBinary).toBe(DEFAULT_SETTINGS.tmuxBinary);
    expect(mergeSettings({ tmuxBinary: "   " }).tmuxBinary).toBe(DEFAULT_SETTINGS.tmuxBinary);
    expect(mergeSettings({ tmuxBinary: 123 as unknown as string }).tmuxBinary).toBe(
      DEFAULT_SETTINGS.tmuxBinary,
    );
  });

  it("clamps and floors orchestrator maxRows/maxCols to [1,3]", () => {
    const out = mergeSettings({
      orchestrator: { maxRows: 2.7, maxCols: 1.9, enabled: true, preferred: "2x2" },
    });
    expect(out.orchestrator.maxRows).toBe(2);
    expect(out.orchestrator.maxCols).toBe(1);
    expect(out.orchestrator.enabled).toBe(true);
    // out of range values rejected
    expect(mergeSettings({ orchestrator: { maxRows: 0 } }).orchestrator.maxRows).toBe(
      DEFAULT_SETTINGS.orchestrator.maxRows,
    );
    expect(mergeSettings({ orchestrator: { maxRows: 4 } }).orchestrator.maxRows).toBe(
      DEFAULT_SETTINGS.orchestrator.maxRows,
    );
    expect(mergeSettings({ orchestrator: { maxCols: 99 } }).orchestrator.maxCols).toBe(
      DEFAULT_SETTINGS.orchestrator.maxCols,
    );
  });

  it("rejects unknown orchestrator preferred layout id", () => {
    expect(
      mergeSettings({ orchestrator: { preferred: "9x9" as unknown as string } }).orchestrator
        .preferred,
    ).toBe(DEFAULT_SETTINGS.orchestrator.preferred);
  });

  it("view.recentResolvedLimit > 0 and floored; openOnStartup boolean", () => {
    expect(mergeSettings({ view: { recentResolvedLimit: 12.9 } }).view.recentResolvedLimit).toBe(12);
    expect(mergeSettings({ view: { recentResolvedLimit: 0 } }).view.recentResolvedLimit).toBe(
      DEFAULT_SETTINGS.view.recentResolvedLimit,
    );
    expect(mergeSettings({ view: { recentResolvedLimit: -3 } }).view.recentResolvedLimit).toBe(
      DEFAULT_SETTINGS.view.recentResolvedLimit,
    );
    expect(mergeSettings({ view: { openOnStartup: true } }).view.openOnStartup).toBe(true);
    expect(
      mergeSettings({ view: { openOnStartup: "yes" as unknown as boolean } }).view.openOnStartup,
    ).toBe(DEFAULT_SETTINGS.view.openOnStartup);
  });

  it("agent hover defaults: preview on, 30 lines, 400ms delay", () => {
    const v = mergeSettings({}).view;
    expect(v.agentHoverPreview).toBe(true);
    expect(v.agentHoverLines).toBe(30);
    expect(v.agentHoverDelayMs).toBe(400);
  });

  it("agent hover: accepts valid overrides; round-trips through mergeSettings", () => {
    const out = mergeSettings({
      view: { agentHoverPreview: false, agentHoverLines: 100, agentHoverDelayMs: 1500 },
    });
    expect(out.view.agentHoverPreview).toBe(false);
    expect(out.view.agentHoverLines).toBe(100);
    expect(out.view.agentHoverDelayMs).toBe(1500);
  });

  it("agent hover: clamps and floors out-of-range numbers (falls back to default)", () => {
    // out of range → keep default
    expect(mergeSettings({ view: { agentHoverLines: 0 } }).view.agentHoverLines).toBe(30);
    expect(mergeSettings({ view: { agentHoverLines: 501 } }).view.agentHoverLines).toBe(30);
    expect(mergeSettings({ view: { agentHoverLines: -3 } }).view.agentHoverLines).toBe(30);
    expect(mergeSettings({ view: { agentHoverDelayMs: -1 } }).view.agentHoverDelayMs).toBe(400);
    expect(mergeSettings({ view: { agentHoverDelayMs: 2001 } }).view.agentHoverDelayMs).toBe(400);
    // floors fractional in-range values
    expect(mergeSettings({ view: { agentHoverLines: 42.9 } }).view.agentHoverLines).toBe(42);
    expect(mergeSettings({ view: { agentHoverDelayMs: 99.7 } }).view.agentHoverDelayMs).toBe(99);
  });

  it("agent hover: rejects non-boolean / non-numeric input", () => {
    expect(
      mergeSettings({ view: { agentHoverPreview: "yes" as unknown as boolean } }).view.agentHoverPreview,
    ).toBe(true);
    expect(
      mergeSettings({ view: { agentHoverLines: "100" as unknown as number } }).view.agentHoverLines,
    ).toBe(30);
    expect(
      mergeSettings({ view: { agentHoverDelayMs: NaN } }).view.agentHoverDelayMs,
    ).toBe(400);
  });

  it("rejects unknown view.defaultTab", () => {
    expect(mergeSettings({ view: { defaultTab: "resolved" } }).view.defaultTab).toBe("resolved");
    expect(
      mergeSettings({ view: { defaultTab: "nope" as unknown as "issues" } }).view.defaultTab,
    ).toBe(DEFAULT_SETTINGS.view.defaultTab);
  });

  it("view.density accepts the two literals; rejects anything else", () => {
    expect(DEFAULT_SETTINGS.view.density).toBe("comfortable");
    expect(mergeSettings({ view: { density: "compact" } }).view.density).toBe("compact");
    expect(mergeSettings({ view: { density: "comfortable" } }).view.density).toBe("comfortable");
    expect(
      mergeSettings({ view: { density: "tight" as unknown as "compact" } }).view.density,
    ).toBe(DEFAULT_SETTINGS.view.density);
    expect(
      mergeSettings({ view: { density: 1 as unknown as "compact" } }).view.density,
    ).toBe(DEFAULT_SETTINGS.view.density);
  });

  it("only accepts terminal === 'Terminal' | 'iTerm'", () => {
    expect(mergeSettings({ terminal: "iTerm" }).terminal).toBe("iTerm");
    expect(mergeSettings({ terminal: "Terminal" }).terminal).toBe("Terminal");
    expect(
      mergeSettings({ terminal: "kitty" as unknown as "iTerm" }).terminal,
    ).toBe(DEFAULT_SETTINGS.terminal);
  });

  it("round-trips orchestratorState through mergeRegistry", () => {
    const state: RegistryData = {
      surfaces: {
        "OP-1": {
          sessionId: "s1",
          windowId: "w1",
          cellIndex: 0,
          layoutId: "2x2",
          tmuxWindow: "OP-1",
        },
      },
      windows: {
        w1: { windowId: "w1", layoutId: "2x2", sessionIds: ["s1"], tmuxSession: "op-agents" },
      },
      windowOrder: ["w1"],
    };
    const out = mergeSettings({ orchestratorState: state });
    expect(out.orchestratorState).toEqual(mergeRegistry(state));
  });

  it("defaults orchestratorState to emptyRegistry() when missing/invalid", () => {
    expect(mergeSettings({}).orchestratorState).toEqual(emptyRegistry());
    expect(mergeSettings({ orchestratorState: "garbage" }).orchestratorState).toEqual(emptyRegistry());
  });

  it("projectOrder defaults to [] and accepts a sanitised string array", () => {
    expect(mergeSettings({}).projectOrder).toEqual([]);
    expect(mergeSettings({ projectOrder: ["foo", "bar"] }).projectOrder).toEqual(["foo", "bar"]);
  });

  it("developer.showDevCommands defaults to false; accepts boolean override; rejects non-boolean", () => {
    expect(mergeSettings({}).developer.showDevCommands).toBe(false);
    expect(mergeSettings({ developer: { showDevCommands: true } }).developer.showDevCommands).toBe(
      true,
    );
    expect(
      mergeSettings({ developer: { showDevCommands: "yes" as unknown as boolean } }).developer
        .showDevCommands,
    ).toBe(false);
    expect(mergeSettings({ developer: "garbage" as unknown as object }).developer.showDevCommands).toBe(
      false,
    );
    // null and array inputs fall through to default (matches agents/github pattern)
    expect(mergeSettings({ developer: null as unknown as object }).developer.showDevCommands).toBe(false);
    expect(mergeSettings({ developer: [] as unknown as object }).developer.showDevCommands).toBe(false);
  });

  it("projectOrder rejects non-array, drops non-string / blank / duplicate entries", () => {
    expect(mergeSettings({ projectOrder: "foo" as unknown as string[] }).projectOrder).toEqual([]);
    expect(mergeSettings({ projectOrder: { 0: "foo" } as unknown as string[] }).projectOrder).toEqual([]);
    expect(
      mergeSettings({
        projectOrder: ["foo", 42 as unknown as string, "", "  ", "bar", "foo"],
      }).projectOrder,
    ).toEqual(["foo", "bar"]);
    expect(mergeSettings({ projectOrder: ["  baz  "] }).projectOrder).toEqual(["baz"]);
  });

  it("OP-208 (8a, cutover): workflowMode default flipped to 'modules' on fresh install", () => {
    expect(DEFAULT_SETTINGS.workflowMode).toBe("modules");
    expect(mergeSettings({}).workflowMode).toBe("modules");
    expect(mergeSettings(null).workflowMode).toBe("modules");
  });

  it("OP-208 (8a, cutover): existing data.json with workflowMode === 'legacy' is preserved (no auto-flip)", () => {
    // Migration semantics from OP-208 scope: users who explicitly opted into
    // 'legacy' (or installed before the field existed and later wrote 'legacy')
    // KEEP that value. The default flip only affects blobs with no
    // workflowMode field at all.
    expect(mergeSettings({ workflowMode: "legacy" }).workflowMode).toBe("legacy");
    expect(mergeSettings({ workflowMode: "modules" }).workflowMode).toBe("modules");
    // Unknown literal — falls back to (post-cutover) default.
    expect(
      mergeSettings({ workflowMode: "experimental" as unknown as "legacy" }).workflowMode,
    ).toBe("modules");
    // Empty string — typeof check passes, but WORKFLOW_MODES.has("") is false → default.
    expect(
      mergeSettings({ workflowMode: "" as unknown as "legacy" }).workflowMode,
    ).toBe("modules");
    // Non-string — falls back to default.
    expect(
      mergeSettings({ workflowMode: 1 as unknown as "legacy" }).workflowMode,
    ).toBe("modules");
    expect(
      mergeSettings({ workflowMode: null as unknown as "legacy" }).workflowMode,
    ).toBe("modules");
    // Arrays / objects fail the typeof guard before WORKFLOW_MODES.has — no coercion possible.
    expect(
      mergeSettings({ workflowMode: ["legacy"] as unknown as "legacy" }).workflowMode,
    ).toBe("modules");
    expect(
      mergeSettings({ workflowMode: { valueOf: () => "legacy" } as unknown as "legacy" }).workflowMode,
    ).toBe("modules");
  });

  it("OP-198: workflowVars defaults to {} on fresh install; not shared with DEFAULT_SETTINGS", () => {
    expect(DEFAULT_SETTINGS.workflowVars).toEqual({});
    const out = mergeSettings({});
    expect(out.workflowVars).toEqual({});
    expect(out.workflowVars).not.toBe(DEFAULT_SETTINGS.workflowVars);
  });

  it("OP-198: workflowVars accepts a string-keyed string-valued map", () => {
    const out = mergeSettings({
      workflowVars: { repo_path: "/Users/x/projects/foo", reviewer_handle: "@you" },
    });
    expect(out.workflowVars).toEqual({
      repo_path: "/Users/x/projects/foo",
      reviewer_handle: "@you",
    });
  });

  it("OP-198: workflowVars drops non-string values; rejects non-object input", () => {
    const out = mergeSettings({
      workflowVars: {
        good: "ok",
        num: 42 as unknown as string,
        nope: null as unknown as string,
        nested: { not: "flat" } as unknown as string,
        arr: ["a"] as unknown as string,
        also_good: "yes",
      },
    });
    expect(out.workflowVars).toEqual({ good: "ok", also_good: "yes" });
    // Non-object inputs fall through to default empty map.
    expect(mergeSettings({ workflowVars: "garbage" as unknown as object }).workflowVars).toEqual({});
    expect(mergeSettings({ workflowVars: 42 as unknown as object }).workflowVars).toEqual({});
    // Arrays are objects but not records — rejected, default stays.
    expect(mergeSettings({ workflowVars: ["a", "b"] as unknown as object }).workflowVars).toEqual({});
  });

  it("OP-198: workflowVars edge cases — empty string stored, long string stored, keys with dots/slashes stored", () => {
    // Empty string is a valid string value — stored as-is so a module can
    // render {{vars.foo}} → "" (suppress) rather than the raw placeholder.
    expect(mergeSettings({ workflowVars: { silent: "" } }).workflowVars).toEqual({ silent: "" });
    // Long strings (e.g. a template body): no cap in mergeSettings.
    const long = "x".repeat(5000);
    expect(mergeSettings({ workflowVars: { big: long } }).workflowVars).toEqual({ big: long });
    // Keys with dots / slashes pass through — the template engine is
    // responsible for namespace resolution; mergeSettings doesn't tokenise
    // the key.
    expect(
      mergeSettings({ workflowVars: { "a.b": "v1", "x/y": "v2" } }).workflowVars,
    ).toEqual({ "a.b": "v1", "x/y": "v2" });
  });

  it("OP-198: existing user upgrading from a version pre-workflowMode picks up the post-cutover default", () => {
    // Simulates a real data.json blob captured before OP-198 — no
    // workflowMode / workflowVars keys at all. After the OP-208 cutover the
    // default is 'modules', so absent-field blobs flip to modules on next
    // load (the composer's legacy-fallback ladder still handles vanilla
    // WORKFLOW.md transparently).
    const out = mergeSettings({
      defaultAgent: "claude",
      injection: { maxBodyChars: 8000 },
      workingDirs: { foo: "/code/foo" },
    });
    expect(out.workflowMode).toBe("modules");
    expect(out.workflowVars).toEqual({});
  });

  it("firstRunCompleted: fresh empty data.json keeps default false; explicit false allowed; existing user inferred true", () => {
    // Fresh install: data.json is empty — firstRunCompleted stays false so
    // the README is scaffolded on first load.
    expect(mergeSettings({}).firstRunCompleted).toBe(false);

    // Explicitly stored false (user ran "reset onboarding"): honoured as-is.
    expect(mergeSettings({ firstRunCompleted: false }).firstRunCompleted).toBe(false);

    // Explicitly stored true: honoured.
    expect(mergeSettings({ firstRunCompleted: true }).firstRunCompleted).toBe(true);

    // Existing user upgrading from ≤ 0.57.x: data.json has other keys but
    // no firstRunCompleted. We infer true so the README isn't scaffolded
    // into a vault already in use.
    expect(mergeSettings({ defaultAgent: "claude" }).firstRunCompleted).toBe(true);
    expect(mergeSettings({ workingDirs: { "my-project": "/code/my-project" } }).firstRunCompleted).toBe(true);
    expect(mergeSettings({ view: { defaultTab: "issues" } }).firstRunCompleted).toBe(true);
  });
});

describe("sanitizeSessionDecorationPalette", () => {
  it("keeps only known Claude colors, lowercases them, and removes duplicates", () => {
    expect(sanitizeSessionDecorationPalette(["RED", " blue ", "blue", "bogus"])).toEqual([
      "red",
      "blue",
    ]);
  });

  it("matches the shipped default palette order", () => {
    expect(sanitizeSessionDecorationPalette([...CLAUDE_SESSION_COLORS])).toEqual([
      ...CLAUDE_SESSION_COLORS,
    ]);
  });
});

describe("matchSettingRow", () => {
  // Substring matcher stub — returns the matched range (truthy) when query is
  // contained in the text, else null. Mirrors prepareFuzzySearch's "match
  // object or null" contract well enough for the predicate's null-check.
  const stubMatcher = (query: string) => (text: string) => {
    const i = text.toLowerCase().indexOf(query.toLowerCase());
    return i === -1 ? null : { score: -i, matches: [[i, i + query.length]] };
  };

  it("returns true for empty/whitespace queries (no filtering)", () => {
    expect(matchSettingRow("Default agent", "Agent launched by op", "", stubMatcher)).toBe(true);
    expect(matchSettingRow("Default agent", "desc", "   ", stubMatcher)).toBe(true);
    expect(matchSettingRow("", "", "", stubMatcher)).toBe(true);
  });

  it("matches against name + desc concatenated", () => {
    // Token only in name
    expect(matchSettingRow("Sidebar density", "Compact tightens padding", "density", stubMatcher)).toBe(true);
    // Token only in desc
    expect(matchSettingRow("Sidebar density", "Compact tightens padding", "padding", stubMatcher)).toBe(true);
    // Token in neither
    expect(matchSettingRow("Sidebar density", "Compact tightens padding", "tmux", stubMatcher)).toBe(false);
  });

  it("returns false when query is non-empty but haystack is empty", () => {
    expect(matchSettingRow("", "", "anything", stubMatcher)).toBe(false);
  });

  it("treats null and undefined match results as non-matches", () => {
    const nullMatcher = () => () => null;
    const undefMatcher = () => () => undefined;
    expect(matchSettingRow("name", "desc", "x", nullMatcher)).toBe(false);
    expect(matchSettingRow("name", "desc", "x", undefMatcher)).toBe(false);
  });

  it("treats any non-null/undefined match result as a match", () => {
    const truthyMatcher = () => () => ({ score: 0 });
    const zeroScoreMatcher = () => () => ({ score: 0, matches: [] });
    expect(matchSettingRow("name", "desc", "x", truthyMatcher)).toBe(true);
    expect(matchSettingRow("name", "desc", "x", zeroScoreMatcher)).toBe(true);
  });
});
