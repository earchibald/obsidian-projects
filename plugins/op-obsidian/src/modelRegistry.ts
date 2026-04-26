// Single source of truth for per-agent model validation. OP-196 (1c) of the
// OP-184 umbrella. No I/O, no Obsidian imports.
//
// Each supported agent has a `{ aliases, versioned }` record:
//
//   - `aliases` maps a bare alias (e.g. "opus", "sonnet", "haiku") to its
//     canonical versioned id (e.g. "claude-opus-4-7"). Aliases are the
//     ergonomic shorthand a workflow file author writes.
//   - `versioned` is the set of canonical ids accepted as-is. Versioned ids
//     pin to a specific point release; aliases float forward as Anthropic ships
//     newer model versions and we update the registry.
//
// A model name is valid for an agent if it appears as a key in `aliases` OR as
// an entry in `versioned`. Resolving an alias yields its canonical id; a
// versioned id resolves to itself.
//
// The registry is the seed for OP-196's `validateModelName`. It also drives
// the recovery dialog OP-184 schedules at 3e: when validation fails, the
// `BadModelSpec` payload carries `allowedAliases` and `allowedVersioned` so
// the dialog can render an "did you mean?" picker without round-tripping
// through this module.
//
// Adding a new model:
//   - To add an ergonomic alias: add `name -> canonicalId` to `aliases` AND
//     add `canonicalId` to `versioned` (the alias must resolve to a known
//     versioned id).
//   - To add a new pinned version: add it to `versioned` only.
//   - To add a new agent: add a top-level entry. The pure registry doesn't
//     enforce the agent id against `agentProfiles.AgentId` — that's a runtime
//     concern, kept separate so this file stays Obsidian-free for vitest.

/**
 * Per-agent model registry. Opaque-by-design: callers should consume via the
 * helpers in this module rather than reaching into the structure.
 */
export interface AgentModelRegistry {
  /** Bare alias -> canonical versioned id. */
  aliases: Record<string, string>;
  /** Canonical versioned ids accepted as-is. */
  versioned: Set<string>;
}

/**
 * Validation result. `ok: true` returns the canonical id (alias resolved, or
 * versioned id passed through). `ok: false` returns a structured `bad`
 * payload — same shape as `WorkflowDiagnostic.extra` for `code: "bad-model"`,
 * so callers can hand it directly to a diagnostic constructor.
 */
export type ValidateModelResult =
  | { ok: true; canonicalId: string }
  | { ok: false; bad: BadModelSpec };

/**
 * Structured payload for an invalid model name. Doubles as the typed surface
 * for the OP-184 §3e recovery dialog and as the `extra` field of a
 * `bad-model` `WorkflowDiagnostic`.
 */
export interface BadModelSpec {
  /** Step id, or "<defaults>" when the bad spec was on top-level `default_model`. */
  stepId: string;
  /** The model name that failed validation. */
  badName: string;
  /** Agent id under which the name was checked. */
  agent: string;
  /** Sorted list of bare aliases the agent accepts. */
  allowedAliases: string[];
  /** Sorted list of canonical versioned ids the agent accepts. */
  allowedVersioned: string[];
}

// Versioned ids are documented in the workspace system prompt:
//   Opus 4.7    -> claude-opus-4-7
//   Sonnet 4.6  -> claude-sonnet-4-6
//   Haiku 4.5   -> claude-haiku-4-5-20251001
//
// Older 4.x and 5.x point releases are also accepted as-is for users who pin.
// This list is conservative — adding a new pinned id is a one-line change.
const CLAUDE_VERSIONED = new Set<string>([
  "claude-opus-4-7",
  "claude-opus-4-6",
  "claude-opus-4-5",
  "claude-sonnet-4-6",
  "claude-sonnet-4-5",
  "claude-haiku-4-5",
  "claude-haiku-4-5-20251001",
]);

const GEMINI_VERSIONED = new Set<string>([
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.0-pro",
  "gemini-2.0-flash",
]);

const COPILOT_VERSIONED = new Set<string>([
  "gpt-5",
  "gpt-4.1",
]);

/**
 * The canonical registry. Keys are agent ids. Aliases must resolve to a value
 * present in `versioned` for the same agent — `validateRegistryShape` (used
 * only in tests) checks this invariant.
 */
export const MODEL_REGISTRY: Record<string, AgentModelRegistry> = {
  claude: {
    aliases: {
      opus: "claude-opus-4-7",
      sonnet: "claude-sonnet-4-6",
      haiku: "claude-haiku-4-5-20251001",
    },
    versioned: CLAUDE_VERSIONED,
  },
  gemini: {
    aliases: {
      pro: "gemini-2.5-pro",
      flash: "gemini-2.5-flash",
    },
    versioned: GEMINI_VERSIONED,
  },
  copilot: {
    aliases: {
      default: "gpt-5",
    },
    versioned: COPILOT_VERSIONED,
  },
};

/**
 * Validate a model name against an agent's registry. Returns the canonical id
 * on success, or a structured `BadModelSpec` payload on failure.
 *
 * Resolution order:
 *   1. Exact match in `aliases` -> return its canonical id.
 *   2. Exact match in `versioned` -> return as-is.
 *   3. Otherwise -> bad-model with allowed-arrays sorted for stable output.
 *
 * Unknown agent id short-circuits to bad-model with empty allowed-arrays —
 * the empty arrays signal "the agent itself isn't recognized" rather than
 * "the agent has no models," which is impossible by construction.
 *
 * Trim is intentional: incoming names from YAML may carry trailing spaces if
 * the author wrote `model: "opus "` deliberately or by accident. Trimming
 * matches the lenient parsing the rest of the workflow-file pipeline does.
 */
export function validateModelName(
  agent: string,
  name: string,
  stepId: string,
): ValidateModelResult {
  const trimmedName = (name ?? "").trim();
  const trimmedAgent = (agent ?? "").trim();
  const reg = MODEL_REGISTRY[trimmedAgent];
  if (!reg) {
    return {
      ok: false,
      bad: {
        stepId,
        badName: trimmedName,
        agent: trimmedAgent,
        allowedAliases: [],
        allowedVersioned: [],
      },
    };
  }
  if (Object.prototype.hasOwnProperty.call(reg.aliases, trimmedName)) {
    return { ok: true, canonicalId: reg.aliases[trimmedName] };
  }
  if (reg.versioned.has(trimmedName)) {
    return { ok: true, canonicalId: trimmedName };
  }
  return {
    ok: false,
    bad: {
      stepId,
      badName: trimmedName,
      agent: trimmedAgent,
      allowedAliases: Object.keys(reg.aliases).sort(),
      allowedVersioned: Array.from(reg.versioned).sort(),
    },
  };
}

/**
 * Returns the list of agent ids the registry knows about, sorted. Useful for
 * agent-id validation, settings UIs, and "did you mean?" prompts when the
 * agent itself is the typo.
 */
export function knownAgents(): string[] {
  return Object.keys(MODEL_REGISTRY).sort();
}

/**
 * Does the registry contain an entry for this agent? Convenience over
 * `MODEL_REGISTRY[id] != null` so callers don't need the import.
 */
export function isKnownAgent(agent: string): boolean {
  return Object.prototype.hasOwnProperty.call(
    MODEL_REGISTRY,
    (agent ?? "").trim(),
  );
}

/**
 * Test-only invariant check: every alias must resolve to a known versioned id
 * for the same agent. Exported so the test suite can assert it; not used at
 * runtime.
 */
export function validateRegistryShape(): string[] {
  const errors: string[] = [];
  for (const [agent, reg] of Object.entries(MODEL_REGISTRY)) {
    for (const [alias, canonicalId] of Object.entries(reg.aliases)) {
      if (!reg.versioned.has(canonicalId)) {
        errors.push(
          `${agent}: alias "${alias}" -> "${canonicalId}" not in versioned set`,
        );
      }
    }
  }
  return errors;
}
