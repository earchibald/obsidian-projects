import { describe, it, expect, vi } from "vitest";
import {
  applyPreset,
  canonicalKey,
  defaultPreset,
  revertPreset,
  type AppLike,
  type Hotkey,
  type HotkeyEntry,
} from "./hotkeyPreset";

describe("defaultPreset", () => {
  const preset = defaultPreset();

  it("returns exactly 12 entries", () => {
    expect(preset).toHaveLength(12);
  });

  it("returns the expected commands in spec-defined order", () => {
    const ids = preset.map((e) => e.command);
    expect(ids).toEqual([
      "op-obsidian:op-open-sidebar",
      "op-obsidian:op-pick-and-act",
      "op-obsidian:op-resume-last",
      "op-obsidian:op-attach-current",
      "op-obsidian:op-open-agent",
      "op-obsidian:op-resolve",
      "op-obsidian:op-new",
      "op-obsidian:op-new-from-selection",
      "op-obsidian:op-new-from-clipboard",
      "op-obsidian:op-append-commit",
      "op-obsidian:op-next-issue",
      "op-obsidian:op-previous-issue",
    ]);
  });

  it("uses Mod+Shift or Mod+Alt only — Obsidian's least-reserved namespaces", () => {
    for (const e of preset) {
      const mods = new Set(e.hotkey.modifiers);
      const isModShift = mods.size === 2 && mods.has("Mod") && mods.has("Shift");
      const isModAlt = mods.size === 2 && mods.has("Mod") && mods.has("Alt");
      expect(isModShift || isModAlt, `unexpected modifiers for ${e.command}: ${[...mods].join(",")}`)
        .toBe(true);
    }
  });

  it("has no duplicate (key, modifiers) pairs", () => {
    const seen = new Set<string>();
    for (const e of preset) {
      const sig = canonicalKey(e.hotkey, /*isMacOS*/ true);
      expect(seen.has(sig), `duplicate signature for ${e.command}: ${sig}`).toBe(false);
      seen.add(sig);
    }
  });

  it("avoids known Obsidian-core conflicts (lookup table snapshot)", () => {
    // Static table of stock Obsidian 1.x bindings that the preset MUST NOT
    // collide with. The preset spec calls these out explicitly: ⌘⇧N (new
    // window), ⌘⇧[ / ⌘⇧] (tab nav) — the preset substitutes ⌘⌥N, ⌘⇧K, ⌘⇧J.
    const obsidianCore: Hotkey[] = [
      { modifiers: ["Mod"], key: "S" }, // editor:save-file
      { modifiers: ["Mod", "Shift"], key: "N" }, // window:new-window
      { modifiers: ["Mod", "Shift"], key: "[" }, // workspace:previous-tab
      { modifiers: ["Mod", "Shift"], key: "]" }, // workspace:next-tab
      { modifiers: ["Mod"], key: "P" }, // command-palette
      { modifiers: ["Mod"], key: "O" }, // quick-switcher
    ];
    const presetSigs = new Set(
      preset.map((e) => canonicalKey(e.hotkey, /*isMacOS*/ true)),
    );
    for (const core of obsidianCore) {
      const sig = canonicalKey(core, true);
      expect(presetSigs.has(sig), `preset must not collide with core binding ${JSON.stringify(core)}`)
        .toBe(false);
    }
  });

  it("returns a fresh deep copy on each call (mutation-safe)", () => {
    const a = defaultPreset();
    a[0].hotkey.modifiers.push("X");
    const b = defaultPreset();
    expect(b[0].hotkey.modifiers).not.toContain("X");
  });
});

describe("canonicalKey", () => {
  it("folds Mod onto Meta on macOS", () => {
    expect(canonicalKey({ modifiers: ["Mod"], key: "S" }, true)).toBe(
      canonicalKey({ modifiers: ["Meta"], key: "S" }, true),
    );
  });

  it("folds Mod onto Ctrl on non-macOS", () => {
    expect(canonicalKey({ modifiers: ["Mod"], key: "S" }, false)).toBe(
      canonicalKey({ modifiers: ["Ctrl"], key: "S" }, false),
    );
  });

  it("is order-insensitive in modifiers", () => {
    expect(canonicalKey({ modifiers: ["Mod", "Shift"], key: "I" }, true)).toBe(
      canonicalKey({ modifiers: ["Shift", "Mod"], key: "I" }, true),
    );
  });

  it("is case-insensitive in key", () => {
    expect(canonicalKey({ modifiers: ["Mod"], key: "S" }, true)).toBe(
      canonicalKey({ modifiers: ["Mod"], key: "s" }, true),
    );
  });
});

/**
 * Test helper that mirrors Obsidian's HotkeyManager closely enough for the
 * apply/revert paths: `customKeys` exposes a *snapshot* via a getter (so direct
 * mutation is a no-op), and writes go through `setHotkeys`/`removeHotkeys`.
 */
function makeApp(overrides?: {
  customKeys?: Record<string, Hotkey[]>;
  defaultKeys?: Record<string, Hotkey[]>;
  commands?: Record<string, { name: string }>;
  saveImpl?: () => void;
  setHotkeysImpl?: (id: string, hotkeys: Hotkey[]) => void;
}): AppLike & { __saved: () => void; __internal: Record<string, Hotkey[]> } {
  const internal: Record<string, Hotkey[]> = overrides?.customKeys
    ? structuredClone(overrides.customKeys)
    : {};
  const defaultKeys = overrides?.defaultKeys ?? {};
  const save = overrides?.saveImpl ?? vi.fn();
  const hm = {
    defaultKeys,
    save,
    setHotkeys:
      overrides?.setHotkeysImpl ??
      ((id: string, hotkeys: Hotkey[]) => {
        internal[id] = hotkeys;
      }),
    getHotkeys: (id: string) => internal[id],
    removeHotkeys: (id: string) => {
      delete internal[id];
    },
    bake: vi.fn(),
  };
  // customKeys is a getter that returns a fresh copy — matches Obsidian's
  // implementation where `Object.assign({}, this[Hb])` is built per-read.
  Object.defineProperty(hm, "customKeys", {
    get: () => Object.assign({}, internal),
    enumerable: true,
  });
  return {
    hotkeyManager: hm as any,
    commands: { commands: overrides?.commands ?? {} },
    __saved: save as () => void,
    __internal: internal,
  };
}

describe("applyPreset — clean apply", () => {
  it("applies all 12 bindings when no conflicts exist", () => {
    const app = makeApp();
    const result = applyPreset(app, defaultPreset(), { isMacOS: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.applied).toHaveLength(12);
    expect(result.skipped).toHaveLength(0);
    expect(Object.keys(app.__internal)).toHaveLength(12);
    expect(app.__saved).toHaveBeenCalled();
  });

  it("snapshots customKeys before mutation for revert", () => {
    const app = makeApp({
      customKeys: { "user-existing": [{ modifiers: ["Mod"], key: "U" }] },
    });
    const result = applyPreset(app, defaultPreset(), { isMacOS: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.previousCustomKeys["user-existing"]).toEqual([
      { modifiers: ["Mod"], key: "U" },
    ]);
    // Snapshot is independent of post-mutation state.
    app.__internal["user-existing"][0].key = "X";
    expect(result.previousCustomKeys["user-existing"][0].key).toBe("U");
  });
});

describe("applyPreset — collision skipping", () => {
  it("skips a binding whose key+modifiers collide with another command", () => {
    const app = makeApp({
      defaultKeys: {
        "third-party:pick-and-act-imposter": [
          { modifiers: ["Mod", "Shift"], key: "I" },
        ],
      },
      commands: {
        "third-party:pick-and-act-imposter": { name: "Imposter: pick and act" },
      },
    });
    const result = applyPreset(app, defaultPreset(), { isMacOS: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.applied.find((e) => e.command === "op-obsidian:op-pick-and-act")).toBeUndefined();
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].binding.command).toBe("op-obsidian:op-pick-and-act");
    expect(result.skipped[0].conflictingCommandId).toBe(
      "third-party:pick-and-act-imposter",
    );
    expect(result.skipped[0].conflictingCommandName).toBe(
      "Imposter: pick and act",
    );
  });

  it("treats own-prefix bindings as non-conflicts (re-apply is idempotent)", () => {
    const preset = defaultPreset();
    const app = makeApp();
    // First apply
    const first = applyPreset(app, preset, { isMacOS: true });
    expect(first.ok && first.applied).toHaveLength(12);
    // Re-apply — every binding still maps to its op-* command, so no conflict
    // is reported.
    const second = applyPreset(app, preset, { isMacOS: true });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.skipped).toHaveLength(0);
    expect(second.applied).toHaveLength(12);
  });

  it("falls back to commandId when commands registry has no display name", () => {
    const app = makeApp({
      defaultKeys: {
        "anon-command": [{ modifiers: ["Mod", "Shift"], key: "I" }],
      },
    });
    const result = applyPreset(app, defaultPreset(), { isMacOS: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const skip = result.skipped.find((s) => s.binding.command === "op-obsidian:op-pick-and-act");
    expect(skip?.conflictingCommandName).toBe("anon-command");
  });

  it("treats customKeys = [] as 'user removed default' and frees the slot", () => {
    const app = makeApp({
      defaultKeys: {
        "third-party:steals-i": [{ modifiers: ["Mod", "Shift"], key: "I" }],
      },
      customKeys: {
        "third-party:steals-i": [], // user removed it via Obsidian Hotkeys UI
      },
    });
    const result = applyPreset(app, defaultPreset(), { isMacOS: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.applied.find((e) => e.command === "op-obsidian:op-pick-and-act")).toBeDefined();
    expect(result.skipped).toHaveLength(0);
  });
});

describe("applyPreset — fallback path", () => {
  it("returns a JSON snippet when setHotkeys is missing (API drift)", () => {
    const app: AppLike = {
      // save present but no setHotkeys — represents Obsidian renaming/removing
      // the public API surface.
      hotkeyManager: { save: vi.fn(), customKeys: {} },
    };
    const result = applyPreset(app, defaultPreset(), { isMacOS: true });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/unavailable|drift/i);
    const parsed = JSON.parse(result.snippet);
    expect(Object.keys(parsed)).toHaveLength(12);
    expect(parsed["op-obsidian:op-pick-and-act"]).toEqual([
      { modifiers: ["Mod", "Shift"], key: "I" },
    ]);
  });

  it("returns a JSON snippet when save() throws", () => {
    const save = vi.fn(() => {
      throw new Error("write failed");
    });
    const app = makeApp({ saveImpl: save });
    const result = applyPreset(app, defaultPreset(), { isMacOS: true });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/write failed/);
    // Snapshot was empty before the mutation began.
    expect(result.previousCustomKeys).toEqual({});
    const parsed = JSON.parse(result.snippet);
    expect(Object.keys(parsed)).toHaveLength(12);
  });

  it("returns a JSON snippet when setHotkeys() throws mid-stream", () => {
    let calls = 0;
    const setHotkeysImpl = vi.fn(() => {
      calls++;
      if (calls > 3) throw new Error("write rejected");
    });
    const app = makeApp({ setHotkeysImpl });
    const result = applyPreset(app, defaultPreset(), { isMacOS: true });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/write rejected/);
    expect(JSON.parse(result.snippet)["op-obsidian:op-pick-and-act"]).toBeDefined();
  });

  it("returns a JSON snippet when hotkeyManager itself is missing", () => {
    const result = applyPreset({}, defaultPreset(), { isMacOS: true });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.snippet.length).toBeGreaterThan(0);
  });
});

describe("revertPreset", () => {
  it("restores customKeys from a snapshot", () => {
    const app = makeApp({
      customKeys: { "user-existing": [{ modifiers: ["Mod"], key: "U" }] },
    });
    const result = applyPreset(app, defaultPreset(), { isMacOS: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(app.__internal).length).toBeGreaterThan(1);
    const revert = revertPreset(app, result.previousCustomKeys);
    expect(revert.ok).toBe(true);
    expect(Object.keys(app.__internal)).toEqual(["user-existing"]);
    expect(app.__internal["user-existing"]).toEqual([
      { modifiers: ["Mod"], key: "U" },
    ]);
  });

  it("clears bindings that didn't exist in the snapshot", () => {
    const app = makeApp();
    applyPreset(app, defaultPreset(), { isMacOS: true });
    expect(Object.keys(app.__internal).length).toBe(12);
    revertPreset(app, {});
    expect(app.__internal).toEqual({});
  });

  it("reports failure when hotkeyManager is unavailable", () => {
    const result = revertPreset({}, {});
    expect(result.ok).toBe(false);
  });
});
