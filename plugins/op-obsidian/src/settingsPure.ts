import { AGENT_IDS, type AgentId, type ProfileOverlay } from "./agentProfiles";
import type { ITermPlacement } from "./terminalLaunch";
import { LAYOUT_IDS, type LayoutId } from "./layout/layouts";
import { type RegistryData, emptyRegistry, mergeRegistry } from "./layout/registry";
import type { OrchestratorSettings } from "./orchestrator";
import { type RecencyEntry, sanitizeRecency } from "./recencyLog";

export const EXTRA_PREAMBLE_MAX = 4000;

/** OP-198 (2a): selector for the workflow-injection engine.
 *  - `'legacy'` (default): `buildPrompt` inlines `Projects/<slug>/WORKFLOW.md`
 *    verbatim (capped at `injection.maxWorkflowChars`).
 *  - `'modules'`: `buildPrompt` calls `loadAndComposeWorkflow` (OP-197) for
 *    the kickoff step and splices the composed text in. Per-mode and
 *    per-step injection arrive in OP-199 (2b) and OP-200 (2c). */
export type WorkflowMode = "legacy" | "modules";
export const WORKFLOW_MODES: ReadonlySet<WorkflowMode> = new Set(["legacy", "modules"]);

export interface InjectionSettings {
  injectBody: boolean;
  maxBodyChars: number;
  includeTasksList: boolean;
  includeRecentCommits: number;
  extraPreamble: string;
  /** When true and `Projects/<slug>/WORKFLOW.md` exists, the kickoff prompt
   * inlines that file's content (capped at {@link maxWorkflowChars}) so the
   * agent can follow the project's SDLC policy without a separate read. */
  includeWorkflow: boolean;
  maxWorkflowChars: number;
}

export type SidebarTab = "issues" | "in-flight" | "resolved";
export type SidebarDensity = "comfortable" | "compact";

export interface ViewSettings {
  defaultTab: SidebarTab;
  recentResolvedLimit: number;
  openOnStartup: boolean;
  /** Visual density of the sidebar list. `compact` tightens vertical padding
   * by 4px and hides the project chip when the rendered list spans only one
   * project. */
  density: SidebarDensity;
  /** When true, hovering an agent badge in the sidebar shows a tmux pane
   * preview after `agentHoverDelayMs`. Default true. */
  agentHoverPreview: boolean;
  /** Lines captured from the agent's tmux pane for the hover preview.
   * Clamped to [1, 500]. Default 30. */
  agentHoverLines: number;
  /** Delay (ms) between mouseenter and the tmux capture call. Clamped to
   * [0, 2000]. Default 400. */
  agentHoverDelayMs: number;
  /** OP-162 / §11: when true, the inline note-level status strip omits PR
   * and GitHub-issue segments (the lazy `gh` fetch never fires). The
   * commit segment still renders. Default false. Useful for users without
   * `gh` configured or in air-gapped environments. */
  disableInlineGithubStatus: boolean;
}

export const AGENT_HOVER_LINES_MIN = 1;
export const AGENT_HOVER_LINES_MAX = 500;
export const AGENT_HOVER_DELAY_MIN = 0;
export const AGENT_HOVER_DELAY_MAX = 2000;

export interface GithubSettings {
  autoCreateGithubIssue: boolean;
  closeGithubIssueOnResolve: boolean;
}

export interface AgentsSettings {
  enforceWorktree: boolean;
}

export interface DeveloperSettings {
  // When true, `op-dev:*` debugging commands appear in the command palette.
  // Default false so end-user palettes aren't crowded with plugin-author
  // diagnostics. Reload the plugin after toggling — Obsidian's `addCommand`
  // is a one-shot at plugin-load and has no `removeCommand` companion.
  showDevCommands: boolean;
}

export interface FlowSettings {
  // When true, the SessionEnd hook auto-launches the next stage per the
  // flowOrchestrator transition matrix. Default false so the v1 ship doesn't
  // surprise users — opt-in via Settings → op → Flow chaining.
  autoAdvance: boolean;
  // When true, the finalize-mode agent is allowed to run `gh pr merge` itself.
  // Default false keeps the destructive merge gated behind explicit user opt-in.
  autoMerge: boolean;
  // Timeout (ms) applied to headless `claude -p` invocations driven by the
  // flow (e.g. evaluator). Default 10 minutes — matches HEADLESS_DEFAULT_TIMEOUT_MS.
  headlessTimeoutMs: number;
}

export const FLOW_HEADLESS_TIMEOUT_DEFAULT_MS = 10 * 60 * 1000;

export interface OpSettings {
  defaultAgent: AgentId;
  alwaysPick: boolean;
  agentOverlays: Partial<Record<AgentId, ProfileOverlay>>;
  injection: InjectionSettings;
  workingDirs: Record<string, string>;
  terminal: "Terminal" | "iTerm";
  iTermPlacement: ITermPlacement;
  /** OP-155 §4 Step 1: when true, agent launches do not bring the terminal
   * app to the foreground. iTerm path uses `open -ga iTerm` (cold-start
   * without activation) and skips the WS `ActivateRequest`. Default false —
   * matches today's behavior, which most users expect when they hit
   * "launch agent". On for users who launch from inside a flow and want
   * Obsidian to keep focus. */
  backgroundLaunch: boolean;
  /** OP-155 §4 Step 4: one-shot bit gating the iTerm-tmux-prefs Notice.
   * Flipped to true after the Notice has been surfaced (or skipped because
   * all prefs already match the recommended values) on the first iTerm
   * tmux-CC launch. Persists across reloads so the Notice never repeats. */
  iTermPrefsNoticeShown: boolean;
  tmuxBinary: string;
  view: ViewSettings;
  github: GithubSettings;
  agents: AgentsSettings;
  developer: DeveloperSettings;
  flow: FlowSettings;
  orchestrator: OrchestratorSettings;
  orchestratorState: RegistryData;
  // User-curated display order for project pickers, by slug. Slugs not in this
  // list (e.g. newly-discovered projects) sort lexically at the tail. Empty
  // array ⇒ pure lexical sort (the historical default).
  projectOrder: string[];
  // Recency log of issues touched via op-work / op-open-agent / sidebar row
  // click. Most-recent first, capped at RECENCY_CAP, dedup by issue id.
  // Drives `op: resume last` and the sidebar Last-touched chip (OP-150).
  recent: RecencyEntry[];
  // OP-161 / §10: flipped to `true` once the first-run README is written
  // into the vault at `Projects/_op-readme.md`. Manually deleting the
  // README does not flip this back — that's the intended dismissal
  // gesture. Set explicitly to `false` (or run the `op: reset onboarding`
  // command, when wired) to re-trigger.
  firstRunCompleted: boolean;
  /** OP-198 (2a): switch between the legacy `WORKFLOW.md` inline-blob path
   *  and the OP-197 modular composer at kickoff. OP-208 (8a, cutover) flipped
   *  the default to `'modules'`; the legacy code path in `promptBuild.ts`
   *  was removed at the same time, so this field now only gates UI affordances
   *  in `launchAgentModal` (panels that prompt the user for module-only inputs
   *  show a "modules disabled" notice when this is `'legacy'`). The composer's
   *  own legacy-fallback ladder (`workflowFile.ts`, shapes 1/2/3/5) handles
   *  vanilla `WORKFLOW.md` transparently regardless of this flag. */
  workflowMode: WorkflowMode;
  /** OP-198 (2a): vault-wide user vars threaded into the composer's
   *  Global precedence layer (OP-197 §"Precedence"). Per-project values live
   *  in the project's `STATUS.md` `vars:` map (resolved by OP-197 already);
   *  per-launch overrides arrive via OP-199/OP-200. Defaults to `{}`. */
  workflowVars: Record<string, string>;
  /** OP-206 (3f): persistent dismiss for the LaunchAgentModal "Composed
   *  prompt preview" auto-expand. The launch counter itself is session-
   *  scoped (`previewAutoExpand.ts`) — this flag, when true, suppresses
   *  auto-expansion regardless of the counter. Defaults to `false`. */
  previewAutoExpandDismissed: boolean;
}

export const DEFAULT_SETTINGS: OpSettings = {
  defaultAgent: "claude",
  alwaysPick: false,
  agentOverlays: {},
  injection: {
    injectBody: true,
    maxBodyChars: 8000,
    includeTasksList: true,
    includeRecentCommits: 5,
    extraPreamble: "",
    includeWorkflow: true,
    // OP-197 (1d) raised this default from 2000 to 50000 (≈ 12.5k tokens).
    // OP-181 plan §"Risks" 1: modern models we target run 200k–1M context
    // windows so the budget is generous; the cap remains a guardrail (info-
    // severity diagnostic on overrun via `composeWorkflow`'s `size-budget`
    // code) rather than a constraint that blocks the launch. Existing user
    // `data.json` blobs preserve their explicitly-saved value through
    // `mergeSettings` below — only fresh installs see the new default.
    maxWorkflowChars: 50000,
  },
  workingDirs: {},
  terminal: "Terminal",
  iTermPlacement: "new-tab",
  backgroundLaunch: false,
  iTermPrefsNoticeShown: false,
  tmuxBinary: "/opt/homebrew/bin/tmux",
  view: {
    defaultTab: "issues",
    recentResolvedLimit: 20,
    openOnStartup: false,
    density: "comfortable",
    agentHoverPreview: true,
    agentHoverLines: 30,
    agentHoverDelayMs: 400,
    disableInlineGithubStatus: false,
  },
  github: {
    autoCreateGithubIssue: false,
    closeGithubIssueOnResolve: true,
  },
  agents: {
    enforceWorktree: false,
  },
  developer: {
    showDevCommands: false,
  },
  flow: {
    autoAdvance: false,
    autoMerge: false,
    headlessTimeoutMs: FLOW_HEADLESS_TIMEOUT_DEFAULT_MS,
  },
  orchestrator: {
    enabled: false,
    maxRows: 3,
    maxCols: 3,
    preferred: "2x3",
  },
  orchestratorState: emptyRegistry(),
  projectOrder: [],
  recent: [],
  firstRunCompleted: false,
  workflowMode: "modules",
  workflowVars: {},
  previewAutoExpandDismissed: false,
};

const SIDEBAR_TABS: ReadonlySet<SidebarTab> = new Set(["issues", "in-flight", "resolved"]);
const SIDEBAR_DENSITIES: ReadonlySet<SidebarDensity> = new Set(["comfortable", "compact"]);

export function mergeSettings(loaded: unknown): OpSettings {
  const base: OpSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  if (!loaded || typeof loaded !== "object") return base;
  const l = loaded as Partial<OpSettings>;
  if (l.defaultAgent && AGENT_IDS.includes(l.defaultAgent as AgentId)) {
    base.defaultAgent = l.defaultAgent as AgentId;
  }
  if (typeof l.alwaysPick === "boolean") base.alwaysPick = l.alwaysPick;
  if (l.agentOverlays && typeof l.agentOverlays === "object") {
    base.agentOverlays = l.agentOverlays;
  }
  if (l.injection && typeof l.injection === "object") {
    base.injection = { ...base.injection, ...l.injection };
  }
  if (l.workingDirs && typeof l.workingDirs === "object") {
    base.workingDirs = { ...l.workingDirs };
  }
  if (l.terminal === "Terminal" || l.terminal === "iTerm") base.terminal = l.terminal;
  if (l.iTermPlacement === "new-tab" || l.iTermPlacement === "new-window") {
    base.iTermPlacement = l.iTermPlacement;
  }
  if (typeof l.backgroundLaunch === "boolean") base.backgroundLaunch = l.backgroundLaunch;
  if (typeof l.iTermPrefsNoticeShown === "boolean") {
    base.iTermPrefsNoticeShown = l.iTermPrefsNoticeShown;
  }
  if (typeof l.tmuxBinary === "string" && l.tmuxBinary.trim()) {
    base.tmuxBinary = l.tmuxBinary.trim();
  }
  if (l.view && typeof l.view === "object") {
    const v = l.view as Partial<ViewSettings>;
    if (v.defaultTab && SIDEBAR_TABS.has(v.defaultTab)) base.view.defaultTab = v.defaultTab;
    if (typeof v.recentResolvedLimit === "number" && v.recentResolvedLimit > 0) {
      base.view.recentResolvedLimit = Math.floor(v.recentResolvedLimit);
    }
    if (typeof v.openOnStartup === "boolean") base.view.openOnStartup = v.openOnStartup;
    if (v.density && SIDEBAR_DENSITIES.has(v.density)) base.view.density = v.density;
    if (typeof v.agentHoverPreview === "boolean") {
      base.view.agentHoverPreview = v.agentHoverPreview;
    }
    if (typeof v.agentHoverLines === "number" && Number.isFinite(v.agentHoverLines)) {
      const n = Math.floor(v.agentHoverLines);
      if (n >= AGENT_HOVER_LINES_MIN && n <= AGENT_HOVER_LINES_MAX) {
        base.view.agentHoverLines = n;
      }
    }
    if (typeof v.agentHoverDelayMs === "number" && Number.isFinite(v.agentHoverDelayMs)) {
      const n = Math.floor(v.agentHoverDelayMs);
      if (n >= AGENT_HOVER_DELAY_MIN && n <= AGENT_HOVER_DELAY_MAX) {
        base.view.agentHoverDelayMs = n;
      }
    }
    if (typeof v.disableInlineGithubStatus === "boolean") {
      base.view.disableInlineGithubStatus = v.disableInlineGithubStatus;
    }
  }
  if (typeof (l as { firstRunCompleted?: unknown }).firstRunCompleted === "boolean") {
    base.firstRunCompleted = (l as { firstRunCompleted: boolean }).firstRunCompleted;
  } else if (Object.keys(l).length > 0) {
    // Existing user upgrading from a version that predates `firstRunCompleted`
    // (≤ 0.57.x). Their data.json has other settings but no
    // `firstRunCompleted` key, so the default (`false`) would wrongly
    // scaffold the first-run README into a vault that's already in use.
    // Treat any non-empty saved data as "first run already completed".
    base.firstRunCompleted = true;
  }
  if (l.orchestrator && typeof l.orchestrator === "object") {
    const o = l.orchestrator as Partial<OrchestratorSettings>;
    if (typeof o.enabled === "boolean") base.orchestrator.enabled = o.enabled;
    if (typeof o.maxRows === "number" && o.maxRows >= 1 && o.maxRows <= 3) {
      base.orchestrator.maxRows = Math.floor(o.maxRows);
    }
    if (typeof o.maxCols === "number" && o.maxCols >= 1 && o.maxCols <= 3) {
      base.orchestrator.maxCols = Math.floor(o.maxCols);
    }
    if (o.preferred && LAYOUT_IDS.includes(o.preferred as LayoutId)) {
      base.orchestrator.preferred = o.preferred as LayoutId;
    }
  }
  base.orchestratorState = mergeRegistry((l as { orchestratorState?: unknown }).orchestratorState);
  if (l.github && typeof l.github === "object") {
    const g = l.github as Partial<GithubSettings>;
    if (typeof g.autoCreateGithubIssue === "boolean") {
      base.github.autoCreateGithubIssue = g.autoCreateGithubIssue;
    }
    if (typeof g.closeGithubIssueOnResolve === "boolean") {
      base.github.closeGithubIssueOnResolve = g.closeGithubIssueOnResolve;
    }
  }
  if (l.agents && typeof l.agents === "object") {
    const a = l.agents as Partial<AgentsSettings>;
    if (typeof a.enforceWorktree === "boolean") {
      base.agents.enforceWorktree = a.enforceWorktree;
    }
  }
  if (l.developer && typeof l.developer === "object") {
    const d = l.developer as Partial<DeveloperSettings>;
    if (typeof d.showDevCommands === "boolean") {
      base.developer.showDevCommands = d.showDevCommands;
    }
  }
  if (Array.isArray((l as { projectOrder?: unknown }).projectOrder)) {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const v of (l as { projectOrder: unknown[] }).projectOrder) {
      if (typeof v !== "string") continue;
      const trimmed = v.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      out.push(trimmed);
    }
    base.projectOrder = out;
  }
  base.recent = sanitizeRecency((l as { recent?: unknown }).recent);
  if (l.flow && typeof l.flow === "object") {
    const f = l.flow as Partial<FlowSettings>;
    if (typeof f.autoAdvance === "boolean") base.flow.autoAdvance = f.autoAdvance;
    if (typeof f.autoMerge === "boolean") base.flow.autoMerge = f.autoMerge;
    if (typeof f.headlessTimeoutMs === "number" && f.headlessTimeoutMs > 0) {
      base.flow.headlessTimeoutMs = Math.floor(f.headlessTimeoutMs);
    }
  }
  if (typeof l.workflowMode === "string" && WORKFLOW_MODES.has(l.workflowMode as WorkflowMode)) {
    base.workflowMode = l.workflowMode as WorkflowMode;
  }
  if (l.workflowVars && typeof l.workflowVars === "object" && !Array.isArray(l.workflowVars)) {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(l.workflowVars as Record<string, unknown>)) {
      // `k` is always a string (Object.entries contract); `v` may be any type
      // if written by a third-party tool — silently skip non-string values.
      if (typeof v !== "string") continue;
      out[k] = v;
    }
    base.workflowVars = out;
  }
  if (typeof (l as { previewAutoExpandDismissed?: unknown }).previewAutoExpandDismissed === "boolean") {
    base.previewAutoExpandDismissed = (l as { previewAutoExpandDismissed: boolean }).previewAutoExpandDismissed;
  }
  return base;
}

export type SettingMatcherFactory = (query: string) => (text: string) => unknown;

export function matchSettingRow(
  name: string,
  desc: string,
  query: string,
  makeMatcher: SettingMatcherFactory,
): boolean {
  const q = query.trim();
  if (!q) return true;
  const haystack = `${name} ${desc}`.trim();
  if (!haystack) return false;
  const result = makeMatcher(q)(haystack);
  return result !== null && result !== undefined;
}
