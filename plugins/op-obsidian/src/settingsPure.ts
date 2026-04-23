import { AGENT_IDS, type AgentId, type ProfileOverlay } from "./agentProfiles";
import type { ITermPlacement } from "./terminalLaunch";
import { LAYOUT_IDS, type LayoutId } from "./layout/layouts";
import { type RegistryData, emptyRegistry, mergeRegistry } from "./layout/registry";
import type { OrchestratorSettings } from "./orchestrator";

export const EXTRA_PREAMBLE_MAX = 4000;

export interface InjectionSettings {
  injectBody: boolean;
  maxBodyChars: number;
  includeTasksList: boolean;
  includeRecentCommits: number;
  extraPreamble: string;
}

export type SidebarTab = "issues" | "in-flight" | "resolved";

export interface ViewSettings {
  defaultTab: SidebarTab;
  recentResolvedLimit: number;
  openOnStartup: boolean;
}

export interface GithubSettings {
  autoCreateGithubIssue: boolean;
  closeGithubIssueOnResolve: boolean;
}

export interface AgentsSettings {
  enforceWorktree: boolean;
}

// OP-101: flips the iTerm driver between the legacy AppleScript implementation
// (default) and the new WebSocket+protobuf client. Default-off through Step 3;
// flipped default-on in Step 4 after a soak.
export interface ITermSettings {
  useWebSocketClient: boolean;
}

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
  iterm: ITermSettings;
  orchestrator: OrchestratorSettings;
  orchestratorState: RegistryData;
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
  },
  workingDirs: {},
  terminal: "Terminal",
  iTermPlacement: "new-tab",
  tmuxBinary: "/opt/homebrew/bin/tmux",
  view: {
    defaultTab: "issues",
    recentResolvedLimit: 20,
    openOnStartup: false,
  },
  github: {
    autoCreateGithubIssue: false,
    closeGithubIssueOnResolve: true,
  },
  agents: {
    enforceWorktree: false,
  },
  iterm: {
    useWebSocketClient: true,
  },
  orchestrator: {
    enabled: false,
    maxRows: 3,
    maxCols: 3,
    preferred: "2x2",
  },
  orchestratorState: emptyRegistry(),
};

const SIDEBAR_TABS: ReadonlySet<SidebarTab> = new Set(["issues", "in-flight", "resolved"]);

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
  if (l.iterm && typeof l.iterm === "object") {
    const i = l.iterm as Partial<ITermSettings>;
    if (typeof i.useWebSocketClient === "boolean") {
      base.iterm.useWebSocketClient = i.useWebSocketClient;
    }
  }
  return base;
}
