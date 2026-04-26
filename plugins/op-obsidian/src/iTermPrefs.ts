import { execFile } from "child_process";
import { promisify } from "util";

import { showActionableNotice } from "./actionableNotices";
import { activateApp } from "./crossAppActivate";

const pExecFile = promisify(execFile);

// OP-155 §4 Step 4 — best-effort detection that iTerm is installed (i.e. has
// a defaults domain). The detailed advanced-pref keys (`Close tmux windows
// after detaching?`, etc.) are not stable across iTerm builds, so the Notice
// itself is the user-education contract; this probe just suppresses the
// surface when iTerm isn't on the system at all.
//
// `defaults domains` is a single comma-space-separated string. A trailing
// comma is normal. Match the iTerm bundle id verbatim — substring search is
// safe because no other domain shares this prefix.
export const ITERM_DEFAULTS_DOMAIN = "com.googlecode.iterm2";

export async function iTermDefaultsDomainPresent(): Promise<boolean> {
  try {
    const { stdout } = await pExecFile("/usr/bin/defaults", ["domains"]);
    return stdout.includes(ITERM_DEFAULTS_DOMAIN);
  } catch {
    // `defaults` is a system binary on every macOS install; if exec fails
    // (sandbox, exotic environment) treat it as inconclusive and return
    // false so the Notice is suppressed rather than fired blindly. The bit
    // is left un-flipped so a subsequent launch in a friendlier environment
    // can still surface the Notice.
    return false;
  }
}

// The pref names the user needs to flip. Spec §4 Step 4 calls these out
// explicitly; we render them inline in the Notice so the user can copy
// them straight into iTerm's settings search.
export const ITERM_TMUX_PREF_RECOMMENDATIONS: ReadonlyArray<string> = [
  'Settings → Profiles → Session → After a session ends → "No Action"',
  'Settings → Advanced → Tmux Integration → "Close tmux windows after detaching?" → No',
  'Settings → Advanced → Tmux Integration → "New tmux windows not created by iTerm2 open in current window?" → Yes',
  'Settings → Advanced → Tmux Integration → "Disable window position restoration in tmux integration" → Yes',
];

// Single-string form rendered in the Notice text. Joined with " · " so the
// inline links machinery doesn't choke on embedded newlines (Notice prose
// is plain text only; we keep the enumeration compact and let the user
// open Settings to drill down).
export function iTermTmuxPrefsNoticeText(): string {
  return (
    "op: iTerm tmux integration tip — these prefs minimize tab snap-back: " +
    ITERM_TMUX_PREF_RECOMMENDATIONS.map((s, i) => `(${i + 1}) ${s}`).join("; ")
  );
}

// Surface the one-time Notice. The caller is responsible for the gate
// (typically the persisted `iTermPrefsNoticeShown` bit) — this function
// always fires when called. Returns whether the Notice was shown so the
// caller can decide whether to flip the bit (we always recommend flipping
// once the call has run, so the user isn't pestered on every launch).
export function showITermTmuxPrefsNotice(): void {
  showActionableNotice({
    text: iTermTmuxPrefsNoticeText(),
    actions: [
      {
        label: "Open iTerm settings",
        // iTerm has no deep-link to a specific pref pane — opening the app
        // and letting the user navigate is the best we can do. Mirrors the
        // approach the spec recommends.
        onClick: () => {
          void activateApp("iTerm");
        },
      },
    ],
  });
}
