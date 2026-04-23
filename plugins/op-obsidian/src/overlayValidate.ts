import type { ProfileOverlay } from "./agentProfiles";

const KNOWN_KEYS = ["binary", "launchFlags", "promptPreamble", "skillTrigger", "label"] as const;
const KNOWN_SET: ReadonlySet<string> = new Set(KNOWN_KEYS);

export interface OverlayValidation {
  ok: boolean;
  overlay?: ProfileOverlay;
  errors: string[];
  warnings: string[];
}

// Validate a parsed overlay object. Unknown keys are warnings (keeps forward-compat);
// wrong-typed known keys are errors (silently dropping would mislead the user).
export function validateOverlay(raw: unknown): OverlayValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, errors: ["overlay must be a JSON object"], warnings };
  }
  const obj = raw as Record<string, unknown>;
  const out: ProfileOverlay = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!KNOWN_SET.has(k)) {
      warnings.push(`unknown key "${k}" (known: ${KNOWN_KEYS.join(", ")})`);
      continue;
    }
    if (k === "launchFlags") {
      if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) {
        errors.push(`"launchFlags" must be an array of strings`);
        continue;
      }
      out.launchFlags = v as string[];
    } else {
      if (typeof v !== "string") {
        errors.push(`"${k}" must be a string`);
        continue;
      }
      (out as Record<string, unknown>)[k] = v;
    }
  }
  return { ok: errors.length === 0, overlay: errors.length === 0 ? out : undefined, errors, warnings };
}
