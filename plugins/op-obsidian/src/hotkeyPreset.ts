/**
 * Default hotkey preset for the op-obsidian plugin (OP-152).
 *
 * Two responsibilities:
 *  - {@link defaultPreset} — the pure list of 10 keybindings the preset binds.
 *  - {@link applyPreset} — best-effort write into Obsidian's
 *    `app.hotkeyManager.customKeys`, with collision-skipping and a JSON-snippet
 *    fallback when the internal API has drifted.
 *
 * The user must explicitly click "Apply preset" in settings — this module is
 * never invoked on plugin load or upgrade.
 */

export interface Hotkey {
  modifiers: string[];
  key: string;
}

export interface HotkeyEntry {
  command: string;
  hotkey: Hotkey;
}

export interface SkippedBinding {
  binding: HotkeyEntry;
  conflictingCommandId: string;
  conflictingCommandName: string;
}

export interface ApplyResultSuccess {
  ok: true;
  applied: HotkeyEntry[];
  skipped: SkippedBinding[];
  previousCustomKeys: Record<string, Hotkey[]>;
}

export interface ApplyResultFallback {
  ok: false;
  reason: string;
  snippet: string;
  previousCustomKeys?: Record<string, Hotkey[]>;
}

export type ApplyResult = ApplyResultSuccess | ApplyResultFallback;

export interface HotkeyManagerLike {
  /**
   * Read-only snapshot of user-overridden hotkeys. Obsidian implements this as
   * a getter that returns a fresh `Object.assign({}, internal)` on each access,
   * so mutations to the returned object are silently discarded — always read
   * via the getter, always write via {@link setHotkeys}.
   */
  customKeys?: Record<string, Hotkey[]>;
  defaultKeys?: Record<string, Hotkey[]>;
  /** `setHotkeys(commandId, hotkeys)` — Obsidian's official write API. */
  setHotkeys?: (commandId: string, hotkeys: Hotkey[]) => void;
  /** `getHotkeys(commandId)` — read effective custom override (no defaults). */
  getHotkeys?: (commandId: string) => Hotkey[] | undefined;
  /** `removeHotkeys(commandId)` — clear override and restore defaults. */
  removeHotkeys?: (commandId: string) => void;
  /** Recompute `bakedHotkeys`/`bakedIds` from current customKeys. */
  bake?: () => void;
  save?: () => void | Promise<void>;
}

export interface CommandRegistryLike {
  commands?: Record<string, { name?: string } | undefined>;
}

export interface AppLike {
  hotkeyManager?: HotkeyManagerLike;
  commands?: CommandRegistryLike;
}

export interface ApplyOptions {
  /** Override platform detection (tests). */
  isMacOS?: boolean;
}

const PRESET: readonly HotkeyEntry[] = [
  { command: "op-obsidian:op-open-sidebar", hotkey: { modifiers: ["Mod", "Shift"], key: "O" } },
  { command: "op-obsidian:op-pick-and-act", hotkey: { modifiers: ["Mod", "Shift"], key: "I" } },
  { command: "op-obsidian:op-resume-last", hotkey: { modifiers: ["Mod", "Shift"], key: "Enter" } },
  { command: "op-obsidian:op-attach-current", hotkey: { modifiers: ["Mod", "Shift"], key: "A" } },
  { command: "op-obsidian:op-open-agent", hotkey: { modifiers: ["Mod", "Shift"], key: "L" } },
  { command: "op-obsidian:op-resolve", hotkey: { modifiers: ["Mod", "Shift"], key: "R" } },
  { command: "op-obsidian:op-new", hotkey: { modifiers: ["Mod", "Alt"], key: "N" } },
  // OP-159 / spec §8: quick-capture shares the `Mod+Alt+` family with op-new.
  // S = Selection, V = clipboard (paste mnemonic).
  { command: "op-obsidian:op-new-from-selection", hotkey: { modifiers: ["Mod", "Alt"], key: "S" } },
  { command: "op-obsidian:op-new-from-clipboard", hotkey: { modifiers: ["Mod", "Alt"], key: "V" } },
  { command: "op-obsidian:op-append-commit", hotkey: { modifiers: ["Mod", "Shift"], key: "." } },
  { command: "op-obsidian:op-next-issue", hotkey: { modifiers: ["Mod", "Shift"], key: "J" } },
  { command: "op-obsidian:op-previous-issue", hotkey: { modifiers: ["Mod", "Shift"], key: "K" } },
];

export function defaultPreset(): HotkeyEntry[] {
  return PRESET.map((e) => ({
    command: e.command,
    hotkey: { modifiers: [...e.hotkey.modifiers], key: e.hotkey.key },
  }));
}

/**
 * Canonical signature for a hotkey, used for conflict comparison. Modifiers are
 * sorted, "Mod" is folded onto the platform's actual modifier (Meta on macOS,
 * Ctrl elsewhere) so a binding written as `["Mod"]` and one written as
 * `["Meta"]` (literal) compare equal on macOS.
 */
export function canonicalKey(h: Hotkey, isMacOS: boolean): string {
  const platformMod = isMacOS ? "Meta" : "Ctrl";
  const mods = h.modifiers
    .map((m) => (m === "Mod" ? platformMod : m))
    .map((m) => m.toLowerCase())
    .sort();
  return `${mods.join("+")}|${h.key.toLowerCase()}`;
}

interface ConflictMap {
  [signature: string]: { commandId: string; commandName: string };
}

function buildConflictMap(
  app: AppLike,
  hm: HotkeyManagerLike,
  isMacOS: boolean,
  ownCommands: ReadonlySet<string>,
): ConflictMap {
  const out: ConflictMap = {};
  const commandIds = new Set<string>([
    ...Object.keys(hm.customKeys ?? {}),
    ...Object.keys(hm.defaultKeys ?? {}),
  ]);

  for (const id of commandIds) {
    if (ownCommands.has(id)) continue; // own bindings are not collisions — re-apply is idempotent
    const effective = effectiveBindings(hm, id);
    for (const hk of effective) {
      const sig = canonicalKey(hk, isMacOS);
      // First binding wins — Obsidian's bakedHotkeys preserves insertion order;
      // we don't have to match it exactly, we just need *some* conflicting
      // command id to surface to the user.
      if (out[sig]) continue;
      const name = app.commands?.commands?.[id]?.name ?? id;
      out[sig] = { commandId: id, commandName: name };
    }
  }
  return out;
}

function effectiveBindings(hm: HotkeyManagerLike, commandId: string): Hotkey[] {
  // customKeys overrides defaultKeys. customKeys[id] = [] means "user removed
  // the default" — treat as no binding. Prefer `getHotkeys` (the official API)
  // when available; fall back to reading the customKeys snapshot.
  const custom =
    typeof hm.getHotkeys === "function" ? hm.getHotkeys(commandId) : hm.customKeys?.[commandId];
  if (custom !== undefined) return custom;
  return hm.defaultKeys?.[commandId] ?? [];
}

export function applyPreset(
  app: AppLike,
  preset: HotkeyEntry[],
  opts: ApplyOptions = {},
): ApplyResult {
  const hm = app.hotkeyManager;
  const isMacOS = opts.isMacOS ?? detectMacOS();

  // The settings UI uses `setHotkeys` to persist changes; mutating the
  // `customKeys` getter directly is silently discarded (it returns a fresh
  // copy each call). Both `setHotkeys` and `save` must exist for a real apply.
  if (
    !hm ||
    typeof hm.save !== "function" ||
    typeof hm.setHotkeys !== "function" ||
    !isPlainObject(hm.customKeys)
  ) {
    return {
      ok: false,
      reason:
        "app.hotkeyManager.setHotkeys/save is unavailable — Obsidian's internal hotkey API has drifted.",
      snippet: snippetFor(preset),
    };
  }

  // Capture before mutation. customKeys is a copy on every read, so this is
  // already a snapshot — but deep-clone the array entries so callers can't
  // accidentally mutate them.
  const previousCustomKeys = deepCloneCustomKeys(hm.customKeys ?? {});
  const ownCommands = new Set(preset.map((e) => e.command));
  const conflictMap = buildConflictMap(app, hm, isMacOS, ownCommands);

  const applied: HotkeyEntry[] = [];
  const skipped: SkippedBinding[] = [];

  for (const entry of preset) {
    const sig = canonicalKey(entry.hotkey, isMacOS);
    const conflict = conflictMap[sig];
    if (conflict) {
      skipped.push({
        binding: entry,
        conflictingCommandId: conflict.commandId,
        conflictingCommandName: conflict.commandName,
      });
      continue;
    }
    try {
      hm.setHotkeys(entry.command, [
        { modifiers: [...entry.hotkey.modifiers], key: entry.hotkey.key },
      ]);
    } catch (err) {
      return {
        ok: false,
        reason: `hotkeyManager.setHotkeys threw on ${entry.command}: ${(err as Error)?.message ?? String(err)}`,
        snippet: snippetFor(preset),
        previousCustomKeys,
      };
    }
    applied.push(entry);
  }

  try {
    if (typeof hm.bake === "function") hm.bake();
    void hm.save();
  } catch (err) {
    return {
      ok: false,
      reason: `hotkeyManager.save() threw: ${(err as Error)?.message ?? String(err)}`,
      snippet: snippetFor(preset),
      previousCustomKeys,
    };
  }

  return { ok: true, applied, skipped, previousCustomKeys };
}

/**
 * Restore `customKeys` from a snapshot captured before {@link applyPreset}.
 * Used by the results modal's "Revert" button (session-scoped).
 */
export function revertPreset(
  app: AppLike,
  snapshot: Record<string, Hotkey[]>,
): { ok: true } | { ok: false; reason: string } {
  const hm = app.hotkeyManager;
  if (
    !hm ||
    typeof hm.save !== "function" ||
    typeof hm.setHotkeys !== "function" ||
    typeof hm.removeHotkeys !== "function" ||
    !isPlainObject(hm.customKeys)
  ) {
    return {
      ok: false,
      reason:
        "app.hotkeyManager.setHotkeys/removeHotkeys/save is unavailable — cannot revert.",
    };
  }
  try {
    // Compute the union of currently-overridden command ids and snapshot ids,
    // then for each: if the snapshot has it, restore; otherwise clear.
    const current = hm.customKeys ?? {};
    const ids = new Set([...Object.keys(current), ...Object.keys(snapshot)]);
    for (const id of ids) {
      if (id in snapshot) {
        hm.setHotkeys(id, snapshot[id].map((h) => ({ modifiers: [...h.modifiers], key: h.key })));
      } else {
        hm.removeHotkeys(id);
      }
    }
    if (typeof hm.bake === "function") hm.bake();
    void hm.save();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: `hotkeyManager.save() threw during revert: ${(err as Error)?.message ?? String(err)}`,
    };
  }
}

function snippetFor(preset: HotkeyEntry[]): string {
  const out: Record<string, Hotkey[]> = {};
  for (const e of preset) {
    out[e.command] = [{ modifiers: [...e.hotkey.modifiers], key: e.hotkey.key }];
  }
  return JSON.stringify(out, null, 2);
}

function deepCloneCustomKeys(src: Record<string, Hotkey[]>): Record<string, Hotkey[]> {
  const out: Record<string, Hotkey[]> = {};
  for (const [id, arr] of Object.entries(src)) {
    out[id] = arr.map((h) => ({ modifiers: [...h.modifiers], key: h.key }));
  }
  return out;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function detectMacOS(): boolean {
  if (typeof navigator !== "undefined" && typeof navigator.platform === "string") {
    return /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
  }
  if (typeof process !== "undefined" && process.platform === "darwin") return true;
  return false;
}
