import { execFile } from "child_process";
import { promisify } from "util";

const pExecFile = promisify(execFile);

/** Minimal shim so tests can inject a fake `execFile` without spawning real
 * processes. Matches the shape of `promisify(execFile)`'s call signature. */
export type ExecShim = (
  file: string,
  args: readonly string[],
) => Promise<{ stdout: string; stderr: string }>;

const HOVER_LINES_MIN = 1;
const HOVER_LINES_MAX = 500;

export function clampHoverLines(lines: number): number {
  if (Number.isNaN(lines)) return HOVER_LINES_MIN;
  if (lines >= HOVER_LINES_MAX) return HOVER_LINES_MAX;
  if (lines <= HOVER_LINES_MIN) return HOVER_LINES_MIN;
  return Math.floor(lines);
}

/**
 * Capture the last `lines` rows of a tmux pane and return them as plain text.
 * Returns null on any failure (window gone, tmux missing, timeout) so callers
 * can silently suppress the popover instead of surfacing a tmux error.
 *
 * - `-p` prints to stdout instead of buffering to a paste buffer.
 * - `-J` joins wrapped lines (more readable in a narrow popover).
 * - `-S -<N>` starts the capture N lines back from the visible region.
 * - We do NOT pass `-e`, so ANSI escape codes are stripped by tmux.
 */
export async function captureTmuxPane(
  tmuxBinary: string,
  session: string,
  window: string,
  lines: number,
  exec: ExecShim = pExecFile,
): Promise<string | null> {
  const n = clampHoverLines(lines);
  try {
    const { stdout } = await exec(tmuxBinary, [
      "capture-pane",
      "-p",
      "-J",
      "-t",
      `${session}:${window}`,
      "-S",
      `-${n}`,
    ]);
    const trimmed = stdout.replace(/\s+$/, "");
    return trimmed.length === 0 ? null : trimmed;
  } catch {
    return null;
  }
}
