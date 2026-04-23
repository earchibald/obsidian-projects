import { existsSync } from "fs";

// Ordered by likelihood on our target platforms (macOS first).
export const TMUX_CANDIDATE_PATHS: readonly string[] = [
  "/opt/homebrew/bin/tmux", // Apple Silicon Homebrew
  "/usr/local/bin/tmux", // Intel Homebrew / MacPorts
  "/opt/local/bin/tmux", // MacPorts alt
  "/usr/bin/tmux", // system (Linux, some macOS)
  "/bin/tmux",
];

export interface TmuxDetection {
  path: string | null;
  tried: readonly string[];
}

export function detectTmux(
  candidates: readonly string[] = TMUX_CANDIDATE_PATHS,
  exists: (p: string) => boolean = existsSync,
): TmuxDetection {
  for (const p of candidates) {
    if (exists(p)) return { path: p, tried: candidates };
  }
  return { path: null, tried: candidates };
}
