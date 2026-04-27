import type { LayoutId } from "./layouts";

// Persistent mapping from issueId → its iTerm surface (which window, which
// cell inside the window's layout). Lives in the plugin's data.json so
// subsequent launches of the same issue land back in the same pane.
//
// Windows themselves are also tracked so the orchestrator can detect overflow
// (all cells in the active window are occupied → spin a new window).

// OP-234: launch-time metadata about the agent occupying a surface. Persisted
// alongside the surface so the OP-230 dashboard daemon can pull a snapshot on
// first connect without re-deriving it from scrollback. All fields except
// `startTime` are optional — pre-OP-217 `data.json` predates this block, so
// the daemon must tolerate `undefined` and degrade to `ctx —` / `model —`.
export interface AgentMetadata {
  // Canonical model id at launch (e.g. "claude-sonnet-4-6"). Sourced from
  // the resolver's chosen model when the workflow file pinned one; undefined
  // when the launch fell back to the agent CLI's default.
  model?: string;
  // Total token budget for `model` (e.g. 200_000 for Claude 4.x). Looked up
  // from `modelRegistry.contextWindowFor` — undefined when the model is
  // unknown or when no model was resolved.
  contextWindowSize?: number;
  // Epoch ms when the surface was assigned. The reattach path preserves the
  // prior value rather than resetting to "now" — the agent process didn't
  // actually restart.
  startTime: number;
  // Absolute path the agent's shell cd'd into. Mirrors the orchestrator's
  // `args.cwd`.
  workdir?: string;
}

export interface SurfaceRef {
  // iTerm session id (UUID string) of the agent's pane. Authoritative —
  // windowId/cellIndex are cache that may become stale if the user rearranges
  // panes manually; sessionId we can always re-select.
  sessionId: string;
  // iTerm window id at assignment time.
  windowId: string;
  // Index into the layout's cells array.
  cellIndex: number;
  // Layout the window was created with (for diagnostics / overflow decisions).
  layoutId: LayoutId;
  // tmux window name the session is attached to (issueId-based).
  tmuxWindow: string;
  // OP-234: launch-time agent metadata. Optional so pre-OP-217 surfaces in
  // an existing data.json keep validating.
  agent?: AgentMetadata;
}

export interface WindowState {
  windowId: string;
  layoutId: LayoutId;
  // Session id per cell index. Sparse: slots cleared when an agent session
  // is closed out explicitly (not tracked here today; orchestrator mainly
  // appends).
  sessionIds: (string | undefined)[];
  // tmux session name (one tmux session per iTerm window).
  tmuxSession: string;
}

export interface RegistryData {
  // issueId → SurfaceRef
  surfaces: Record<string, SurfaceRef>;
  // windowId → WindowState
  windows: Record<string, WindowState>;
  // Ordered list of windowIds; last entry = current active window for new
  // agents until it fills up.
  windowOrder: string[];
}

export function emptyRegistry(): RegistryData {
  return { surfaces: {}, windows: {}, windowOrder: [] };
}

export function mergeRegistry(loaded: unknown): RegistryData {
  const base = emptyRegistry();
  if (!loaded || typeof loaded !== "object") return base;
  const l = loaded as Partial<RegistryData>;
  if (l.surfaces && typeof l.surfaces === "object") {
    for (const [k, v] of Object.entries(l.surfaces)) {
      if (isSurface(v)) {
        // OP-234: drop `agent` entirely when its shape is wrong rather than
        // discarding the whole surface — a malformed metadata block must not
        // break the issue→pane mapping the dashboard depends on.
        const sanitized: SurfaceRef = { ...v };
        if (sanitized.agent !== undefined && !isAgentMetadata(sanitized.agent)) {
          delete sanitized.agent;
        }
        base.surfaces[k] = sanitized;
      }
    }
  }
  if (l.windows && typeof l.windows === "object") {
    for (const [k, v] of Object.entries(l.windows)) {
      if (isWindowState(v)) base.windows[k] = v;
    }
  }
  if (Array.isArray(l.windowOrder)) {
    base.windowOrder = l.windowOrder.filter((x): x is string => typeof x === "string");
  }
  return base;
}

function isSurface(v: unknown): v is SurfaceRef {
  if (!v || typeof v !== "object") return false;
  const s = v as SurfaceRef;
  return (
    typeof s.sessionId === "string" &&
    typeof s.windowId === "string" &&
    typeof s.cellIndex === "number" &&
    typeof s.layoutId === "string" &&
    typeof s.tmuxWindow === "string"
  );
}

// OP-234: structural check for the optional `agent` block on a SurfaceRef.
// `startTime` is the only required field — model / contextWindowSize / workdir
// are all nullable per the spec ("ctx — / model —" rendering on absence).
function isAgentMetadata(v: unknown): v is AgentMetadata {
  if (!v || typeof v !== "object") return false;
  const a = v as AgentMetadata;
  if (typeof a.startTime !== "number" || !Number.isFinite(a.startTime)) return false;
  if (a.model !== undefined && typeof a.model !== "string") return false;
  if (a.contextWindowSize !== undefined && (typeof a.contextWindowSize !== "number" || !Number.isFinite(a.contextWindowSize))) return false;
  if (a.workdir !== undefined && typeof a.workdir !== "string") return false;
  return true;
}

function isWindowState(v: unknown): v is WindowState {
  if (!v || typeof v !== "object") return false;
  const w = v as WindowState;
  return (
    typeof w.windowId === "string" &&
    typeof w.layoutId === "string" &&
    Array.isArray(w.sessionIds) &&
    typeof w.tmuxSession === "string"
  );
}

export function activeWindow(reg: RegistryData): WindowState | undefined {
  for (let i = reg.windowOrder.length - 1; i >= 0; i--) {
    const w = reg.windows[reg.windowOrder[i]];
    if (w) return w;
  }
  return undefined;
}

// Find the first unoccupied cell in a window. Returns undefined if full.
export function firstFreeCell(w: WindowState, cells: number): number | undefined {
  for (let i = 0; i < cells; i++) {
    if (!w.sessionIds[i]) return i;
  }
  return undefined;
}

export function addWindow(reg: RegistryData, w: WindowState): void {
  reg.windows[w.windowId] = w;
  if (!reg.windowOrder.includes(w.windowId)) reg.windowOrder.push(w.windowId);
}

export function assignSurface(
  reg: RegistryData,
  issueId: string,
  ref: SurfaceRef,
): void {
  reg.surfaces[issueId] = ref;
  const w = reg.windows[ref.windowId];
  if (w) w.sessionIds[ref.cellIndex] = ref.sessionId;
}
