export interface ColorAssignmentArgs {
  issueId: string;
  parentId?: string | null;
  windowKey: string;
  palette: readonly string[];
}

export interface ColorRegistrySnapshot {
  byIssue: Record<string, { color: string; windowKey: string }>;
  byWindow: Record<string, string[]>;
}

interface IssueColorState {
  color: string;
  windowKey: string;
}

export interface ColorRegistry {
  assign(args: ColorAssignmentArgs): string;
  release(issueId: string): void;
  snapshot(): ColorRegistrySnapshot;
  reset(): void;
}

export function createColorRegistry(random: () => number = Math.random): ColorRegistry {
  const byIssue = new Map<string, IssueColorState>();
  const byWindow = new Map<string, Set<string>>();

  const rebuildWindow = (windowKey: string): void => {
    const next = new Set<string>();
    for (const state of byIssue.values()) {
      if (state.windowKey === windowKey) next.add(state.color);
    }
    if (next.size === 0) {
      byWindow.delete(windowKey);
    } else {
      byWindow.set(windowKey, next);
    }
  };

  return {
    assign(args) {
      const existing = byIssue.get(args.issueId);
      if (existing) return existing.color;
      if (args.palette.length === 0) {
        throw new Error("colorRegistry.assign requires a non-empty palette");
      }

      const inherited = args.parentId ? byIssue.get(args.parentId) : undefined;
      const taken = byWindow.get(args.windowKey) ?? new Set<string>();
      const available = args.palette.filter((color) => !taken.has(color));
      const pool = available.length > 0 ? available : [...args.palette];
      const color = inherited?.color ?? pool[Math.floor(random() * pool.length)] ?? args.palette[0];

      byIssue.set(args.issueId, { color, windowKey: args.windowKey });
      rebuildWindow(args.windowKey);
      return color;
    },

    release(issueId) {
      const existing = byIssue.get(issueId);
      if (!existing) return;
      byIssue.delete(issueId);
      rebuildWindow(existing.windowKey);
    },

    snapshot() {
      const issueSnapshot: ColorRegistrySnapshot["byIssue"] = {};
      for (const [issueId, state] of byIssue.entries()) {
        issueSnapshot[issueId] = { ...state };
      }
      const windowSnapshot: ColorRegistrySnapshot["byWindow"] = {};
      for (const [windowKey, colors] of byWindow.entries()) {
        windowSnapshot[windowKey] = [...colors];
      }
      return {
        byIssue: issueSnapshot,
        byWindow: windowSnapshot,
      };
    },

    reset() {
      byIssue.clear();
      byWindow.clear();
    },
  };
}

export const colorRegistry = createColorRegistry();
