import { execFile } from "child_process";
import { promisify } from "util";

const pExecFile = promisify(execFile);

// OP-155 §4 Step 3 — non-AppleScript cross-app activation. `open -a <name>`
// is macOS's standard "Open With…" handler dispatch path; it activates the
// target app the same way the dock or Spotlight would, without putting any
// AppleScript on the wire. The OP-101 → OP-154 retirement removed every
// scripted-activation callsite from `terminalLaunch.ts` and `client.ts`;
// this helper is the codified replacement so future cross-app focus changes
// don't re-introduce `osascript` callsites.
//
// Best-effort: if the target app isn't installed, `open` fails — swallow
// silently because activation is cosmetic. The caller has already done its
// work (created a tmux window, etc.); the user just won't see the focus
// change. iTerm/Terminal/Obsidian are the three callsites today.
export async function activateApp(name: "Obsidian" | "iTerm" | "Terminal"): Promise<void> {
  try {
    await pExecFile("/usr/bin/open", ["-a", name]);
  } catch {
    // Intentionally ignored — see comment above.
  }
}
