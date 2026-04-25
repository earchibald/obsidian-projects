import { AGENT_IDS, type AgentId, type ProfileOverlay } from "./agentProfiles";
import type { ITermPlacement } from "./terminalLaunch";
import { LAYOUT_IDS, type LayoutId } from "./layout/layouts";
import { type RegistryData, emptyRegistry, mergeRegistry } from "./layout/registry";
import type { OrchestratorSettings } from "./orchestrator";
import { type RecencyEntry, sanitizeRecency } from "./recencyLog";

export const EXTRA_PREAMBLE_MAX = 4000;

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
}

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
    maxWorkflowChars: 2000,
  },
  workingDirs: {},
  terminal: "Terminal",
  iTermPlacement: "new-tab",
  tmuxBinary: "/opt/homebrew/bin/tmux",
  view: {
    defaultTab: "issues",
    recentResolvedLimit: 20,
    openOnStartup: false,
    density: "comfortable",
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
  return base;
}
