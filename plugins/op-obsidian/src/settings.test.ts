import { describe, it, expect } from "vitest";
import { DEFAULT_SETTINGS, mergeSettings } from "./settingsPure";
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
    expect(out.github.autoCreateGithubIssue).toBe(true);
    expect(out.github.closeGithubIssueOnResolve).toBe(DEFAULT_SETTINGS.github.closeGithubIssueOnResolve);
    expect(out.agents.enforceWorktree).toBe(true);
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

  it("rejects unknown view.defaultTab", () => {
    expect(mergeSettings({ view: { defaultTab: "resolved" } }).view.defaultTab).toBe("resolved");
    expect(
      mergeSettings({ view: { defaultTab: "nope" as unknown as "issues" } }).view.defaultTab,
    ).toBe(DEFAULT_SETTINGS.view.defaultTab);
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
});
