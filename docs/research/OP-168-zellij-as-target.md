---
project: obsidian-projects
type: doc
doc_type: research
issue: "[[OP-168 Review zellij as target]]"
created: 2026-04-25
status: draft
tags:
  - project/obsidian-projects
  - doc
---

# OP-168 — Zellij as a target for the tmux + iTerm orchestrator

Review of [zellij](https://github.com/zellij-org/zellij) as a candidate replacement for the tmux + iTerm-orchestrator stack that today hosts op-obsidian agents (`plugins/op-obsidian/src/terminalLaunch.ts`, `orchestrator.ts`, `iterm/*`). Evidence is mixed `[probe]` (verified locally with zellij 0.44.1 / `brew install zellij` on macOS 25.3) and `[doc]` (zellij.dev docs, GitHub source/issues).

---

## TL;DR — verdict

**HOLD.** Revisit when **either** (a) zellij ships independent-per-client tab focus on a shared session (issue [#4253](https://github.com/zellij-org/zellij/issues/4253), open) **or** (b) the team consciously accepts losing the per-pane viewer pattern *and* iTerm's native-tabs-from-tmux integration. The probe demonstrates that the headless orchestration primitives we'd need (detached create, by-pane-id targeting, layout injection) all work today on 0.44.1, so the technical direction is sound. The blockers are not capability gaps in the small — they are loss of two specific architectural properties that today's stack relies on, plus the fact that the relevant CLI surface (`attach -b`, `action new-tab -l`, cross-session `--pane-id`) all landed in the just-shipped 0.44 release (April 2026). Pre-1.0 software with a 3-week-old automation surface is not the right base for a one-shot multi-week migration.

OP-154 (migrate `terminalLaunch.ts` off AppleScript onto the iTerm WS wrapper) is **not affected by this verdict** and should proceed independently — it improves the current stack regardless of any future zellij decision.

---

## What today's stack actually does

The orchestrator surface is bigger than the issue body's "~1.5k LoC" estimate:

| File | LoC | Role |
| :--- | ---: | :--- |
| `plugins/op-obsidian/src/terminalLaunch.ts` | 321 | Build prep + inner shell scripts; spawn iTerm via AppleScript or hand to orchestrator. |
| `plugins/op-obsidian/src/orchestrator.ts` | 394 | Layout-aware iTerm-pane assignment; tracks registry of windows × cells × sessions. |
| `plugins/op-obsidian/src/agentSessionCleanup.ts` | 135 | `tmux kill-window` + registry pruning + best-effort iTerm window close. |
| `plugins/op-obsidian/src/revealAgentSession.ts` | 84 | Resolve issueId → live tmux window or registered iTerm session. |
| `plugins/op-obsidian/src/staleAgentBadges.ts` | 74 | `tmux list-windows` probe driving the sidebar's stale-agent badge. |
| `plugins/op-obsidian/src/tmuxDetect.ts` | 25 | Brew/Mac path discovery. |
| `plugins/op-obsidian/src/layout/layouts.ts` | 144 | 8 declarative split specs (`1`, `1x2`, `3`, `2x2`, `2+3`, `2x3`, `2x3+2`, `3x3`). |
| `plugins/op-obsidian/src/iterm/*.ts` (hand-written) | 1057 | iTerm WS client, cookie auth, transport, driver. |
| `plugins/op-obsidian/src/iterm/*.test.ts` | 523 | Tests for the above. |
| `plugins/op-obsidian/src/iterm/proto/api.generated.d.ts` | 19178 | Auto-generated protobuf types. |
| Orchestrator test files (`orchestrator.test.ts`, `terminalLaunch.test.ts`, `agentSessionCleanup.test.ts`, `staleAgentBadges.test.ts`, `tmuxDetect.test.ts`, `layout/layouts.test.ts`) | 564 | Tests for the non-iterm source. Not counted in the source total — same logic as excluding `iterm/*.test.ts`. |
| **Total non-generated source** | **~2.2k** | |

Two overlapping mechanisms:

1. **Process host (tmux).** Every agent runs inside a tmux window of `op-agents-N` (per-iTerm-window session), named by sanitized issue id. Killing iTerm doesn't kill the agent. Observability uses `tmux list-windows`, `tmux capture-pane`, and `tmux has-session` — the exit codes and `-F '#W'` formatting drive `staleAgentBadges.ts`.
2. **Layout engine (iTerm orchestrator).** Each agent gets one iTerm pane. The pane runs a tiny "view script" that joins a *grouped* tmux session (`view-${issueId}`) and selects the agent's window. The grouped-session trick is the only way each iTerm pane can show a different agent while sharing one underlying session — `orchestrator.ts:263–290`.

Both mechanisms are macOS-specific; the project's policy is macOS-only.

---

## Dimension-by-dimension findings

### 1. Process & session model — pass

Zellij's client/server split means a session created with `zellij attach -b <name>` is a daemonized server that survives every client closing. `zellij list-sessions` enumerates them. **`[probe]`** Created `op-168-probe` headless via `zellij attach -b`, ran the entire test sequence with zero clients attached, then `zellij kill-session` to tear down — no PTY harness, no `script(1)` wrapper.

Mapping: zellij **session** = tmux session, **tab** = tmux window, **pane** = tmux pane. Closest fit for the existing window-per-issue model is **tab-per-issue** inside a shared session.

### 2. Layout surface (KDL) — pass

KDL maps cleanly to `layout/layouts.ts`. The 2x3 layout tested:

```kdl
layout {
    pane split_direction="horizontal" {
        pane split_direction="vertical" {
            pane name="cell-0" command="bash" { args "-c" "echo CELL_0_READY; while true; do sleep 30; done" }
            pane name="cell-1" command="bash" { args "-c" "..." }
            pane name="cell-2" command="bash" { args "-c" "..." }
        }
        pane split_direction="vertical" {
            pane name="cell-3" ...
            pane name="cell-4" ...
            pane name="cell-5" ...
        }
    }
}
```

**`[probe]`** All 6 panes spawned with their commands; KDL `name=` attribute surfaces as the pane TITLE in `action list-panes`. Splits are nested by direction so the 8 layouts in `layouts.ts` are mechanical to translate; we'd write a generator from the existing `SplitOp` array.

### 3. External scripting — pass with a quirk

Targeting a session: **two equivalent forms**, both `[probe]`-verified:

```bash
zellij --session NAME action <cmd>          # top-level flag
ZELLIJ_SESSION_NAME=NAME zellij action <cmd>  # env var
```

The top-level `--session` flag does **not** set the name when used with a TTY-attached startup (`zellij --session NAME --layout PATH` was silently renamed `mellifluous-platypus` in our test). This is a documentation/CLI papercut worth reporting upstream but not a blocker — `zellij attach -b NAME` followed by `--session NAME action ...` works.

`action list-panes` returns space-separated columns (`PANE_ID  TYPE  TITLE`) — easy to parse. `action new-tab` returns the new tab's id on stdout. `action new-pane` returns the new pane id (`terminal_N`).

### 4. Pane targeting — pass (this is the headline win for observability)

**`[probe]`** Every action that needs a target accepts `--pane-id terminal_N`:

- `action dump-screen --pane-id terminal_1` — dumped cell-0's contents while focus was elsewhere. **No focus change, no client required.** Direct analogue of `tmux capture-pane -p -t <window>:<pane>`.
- `action focus-pane-id terminal_N`
- `action new-pane --tab-id N` — spawn a new pane in a *specific* tab (not just the focused tab).

Caveat: `action write-chars`/`action write` send keystrokes to the **focused** pane only; there's no `--pane-id` on either. To inject into a non-focused pane the script must `focus-pane-id` first. Acceptable cost — our orchestrator only sends startup commands and never needs to target a non-focused pane.

### 5. Grouped / mirrored attach — **fail (structural)**

**`[doc]`** Zellij is **mirror-only** when multiple clients attach to one session: all clients share the focused tab/pane, and the session is sized to the smallest attached terminal. Independent per-client tab/pane focus is an open feature request ([zellij-org/zellij#4253](https://github.com/zellij-org/zellij/issues/4253), open as of April 2026).

**Probe coverage gap.** This dimension was confirmed from docs and the tracking issue rather than by actually attaching two clients and verifying the behavior. A complete probe would have: opened two `zellij attach <name>` sessions in separate terminals, navigated tabs independently on client A, and confirmed client B mirrored the focus change. The tracking issue is filed by the zellij team themselves and describes a conscious design constraint, not a bug, so the `[doc]` verdict is reliable — but it's a weak spot in the probe coverage.

**Impact:** the current `view-${issueId}` grouped-tmux-session trick is impossible to translate. The trick is what lets each iTerm pane in our 2x3 layout independently show a *different* agent's window despite all attaching to the same tmux session. Without it the design has to change — most cleanly to **one zellij session per agent** instead of one shared session with N tabs.

**Does the one-session-per-agent workaround actually work?**

- *Observability preserved.* `zellij list-sessions -s` still enumerates all sessions. `staleAgentBadges.ts` becomes: scan session names matching the `op-agent-<issueId>` naming convention, then `dump-screen --pane-id` each. Works headless.
- *Cleanup arguably simpler.* `zellij kill-session op-agent-OP-168` is atomic — no registry pruning, no iTerm window close, just one command. Today `agentSessionCleanup.ts` does three operations.
- *Single-attach-point lost.* Today `tmux attach -t op-agents-N` lets you tab through every running agent in one UI. With N sessions you must attach to each by name or build a session-picker wrapper. This is a genuine ergonomic regression for interactive human review.
- *Session proliferation risk.* If cleanup misses a session, the `op-agent-*` namespace grows unboundedly. Today, orphaned tmux windows stay inside a bounded set of `op-agents-N` sessions. Not a blocker, but worth handling in the cleanup design.

Net: the workaround is operationally sound, not a hard blocker, but does shed the "single attach point" UX property that the current shared-session design provides.

### 6. Liveness / observability — pass with a caveat

- `[probe]` `action dump-screen --pane-id N` is the direct `tmux capture-pane` analogue — works headless, no focus required. Confirmed by dumping cell-0 and cell-5 while focus was on cell-2.
- `[probe]` `list-sessions -s` (short form) prints just session names — `zellij list-sessions -s | grep -Fxq <name>` is a clean `tmux has-session` analogue. Probe step 14: `has-session OK`.
- `[probe]` `action list-panes` lists every pane in the session with id, type, title. Drives a `staleAgentBadges.ts` analogue: scan titles (or KDL pane names) for known issue ids.
- `[doc]` No dedicated `has-session` exit-code command. Grep is the workaround — same operational ergonomics, slightly longer.
- `[doc]` `zellij list-sessions` tags exited sessions inline (`(EXITED - attach to resurrect)`) — useful state we don't currently surface but could.

### 7. Title / OSC 2 forwarding — **fail**

**`[doc]`** Zellij owns the host terminal title and rewrites it from focused-pane state. OSC 2 / OSC 0 emitted by inner programs is consumed for zellij's own pane titlebar, not forwarded to iTerm/Terminal. There is no documented option to disable this ([zellij-org/zellij#3875](https://github.com/zellij-org/zellij/issues/3875)).

**Impact:** the per-pane OSC 2 emit at `orchestrator.ts:278–286` (which sets each iTerm pane's title to the issue title before tmux attaches) stops working. We lose the "iTerm window/tab title shows OP-168 — Review zellij as target" behavior. Recoverable via iTerm WS `setSessionName`, but only if iTerm is still in the picture.

### 8. Terminal-host coupling — pass

`[doc]` Zellij is host-agnostic — runs in Terminal.app, kitty, ghostty, alacritty, wezterm. Known macOS frictions are around Alt-key mapping (per-terminal config) and OSC 52 clipboard variability; nothing structural. If we go full role (c), this is the upside: **drop the iTerm dependency** and let users pick a host.

### 9. Working dir / PATH — pass with a wrap

`[doc]` Zellij `exec`s `$SHELL` non-login when it spawns a command pane. `~/.profile` / `/etc/profile` are not sourced; PATH inheritance is whatever the parent shell exported. The `terminalLaunch.ts` PATH injection (`/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$HOME/bin:$PATH`) needs to move from a wrapper script into either:
- Each pane's KDL `command "bash"; args "-lc" "..."` (login shell wrap), or
- A `cwd` + explicit env via KDL `env { PATH "..." }`.

Either is mechanical. Not a blocker.

### 10. `tmux -CC` analogue — **fail**

`[doc]` Zellij has **no control-mode protocol**. The closest primitive is `zellij subscribe --format json` (NDJSON viewport stream per pane) — useful for observability but not for surfacing zellij sessions as native iTerm tabs. The `tmux -CC` integration that today's `terminalLaunch.ts` uses for the non-orchestrator iTerm path is gone.

**Impact:** for users who attach manually outside the orchestrator, native iTerm tabs go away. They'd attach via `zellij attach <name>` in a regular iTerm shell instead — functionally equivalent, but one rendered-pane-per-iTerm-tab is replaced by one zellij UI per iTerm tab.

### 11. Stability / release cadence — pass with a yellow flag

`[doc]` Zellij 0.44.1 is the current stable release (April 2026), MIT-licensed. The 0.44 release shipped the entire "remote sessions / CLI automation" subsystem we'd depend on (`attach -b`, cross-session `--pane-id` targeting, `subscribe`). That subsystem is **roughly 3 weeks old** at the time of writing. Zellij is still pre-1.0 — backwards-compatibility is not promised.

### 12. Production users — yellow flag

`[doc]` No prominent named users orchestrating long-running multi-agent processes via zellij's external scripting surface. The 0.44 release post explicitly markets the new CLI for "automated terminal workflows and CI-like pipelines" — our use case is the kind of workflow they want to enable, but we'd be a relatively early adopter.

### 13. Zellij WASM plugin surface — pass (additive upside)

`[doc]` Zellij supports first-party plugins written in Rust or any other language that compiles to WASM. Plugin instances render into panes with full UI primitives (tabs, panes, status bars). An Obsidian-aware status plugin could show live agent state (current OP issue, elapsed time, last log line) inline without switching focus. This is pure additive capability — tmux has no equivalent. Not a migration blocker, but worth noting as a future-value item if we ever land on role (c).

### 14. Session resurrection for crashed agents — pass (better than tmux)

`[doc]` `zellij list-sessions` tags exited sessions with `(EXITED - attach to resurrect)`. Re-attaching to an exited session reopens the UI with the scrollback intact. For a crashed agent pane, the pane remains visible with the terminal history frozen at the crash point — the same ergonomic as detaching from a dead tmux window, but made explicit in the session list. This is marginally better than tmux's silent dead shell. Verdict contribution: neutral to positive.

### 15. Signal handling / key interception — yellow flag

`[doc]` Zellij captures a configurable leader key sequence (default: `Ctrl-g` on 0.44.1) before passing other keystrokes through to panes. `Ctrl-c` is passed through normally. However, if any Claude Code TUI session tries to use `Ctrl-g` (unlikely but not impossible), it would silently trigger the zellij pane switcher instead. The leader is fully configurable via KDL config, so this is not a hard blocker. Signal propagation (`SIGTERM`, `SIGHUP`) follows the standard PTY chain as with tmux — killing the zellij server delivers `SIGHUP` to all child processes. Worth verifying with a Claude Code session before committing to role (c).

### 16. `$TERM` / terminfo differences — yellow flag

`[doc]` Zellij sets `$TERM=xterm-256color` (or `xterm-256color-zellij` on some versions) inside panes. tmux sets `$TERM=screen-256color` by default. Claude Code's TUI currently runs against `screen-256color`; moving to `xterm-256color` changes the terminfo entry used for cursor positioning and colour sequences. In practice, most modern TUI applications handle both safely, but `xterm-256color` lacks the `Ss`/`Se` cursor-style sequences that tmux's terminfo provides, which affects cursor shape in some editors. This is testable and almost certainly benign for Claude Code's text-output use case, but should be verified empirically before committing to role (c).

---

## Subsystem-replacement map by role

| Role | Replaces | Keeps | Migration size | Worth doing? |
| :--- | :--- | :--- | :--- | :--- |
| **(a) tmux replacement only** | `terminalLaunch.ts:buildPrepScript`, `staleAgentBadges.probeLiveTmuxWindows`, `agentSessionCleanup`, `tmuxDetect`, `revealAgentSession` tmux paths | iTerm orchestrator + WS driver intact | ~600 LoC churn, no LoC removed | **No.** Still doing iTerm splits + nested host. Same complexity, new technology. |
| **(b) orchestrator (layout) replacement only** | `orchestrator.ts`, `layout/layouts.ts`, `iterm/*` | tmux for agent host | ~2.0k LoC removed, ~300 LoC added | **No.** Loses iTerm-CC tab integration without shedding tmux. Net regression for power users. |
| **(c) both** | Everything in (a) and (b) | nothing | ~2.2k LoC source + ~19k generated removed; ~400 LoC added | **Maybe later.** Cleanest architecture *if and when* the multi-client mirror gap closes and we accept the OSC 2 + iTerm-CC losses. |

Role (a) alone has been seriously considered before (it's effectively the path OP-154 hints at extending). It doesn't shed enough to justify the rewrite. Role (c) is the prize, but pays for the architectural simplification with the mirror constraint.

---

## What we'd lose (the bias-toward-novelty tax)

- **Per-pane independent viewers.** Today, two iTerm panes attached to the same tmux session can show different agents. Under zellij we'd have one session per agent, or accept that all clients see the same focus.
- **Single-attach-point for all agents.** Today `tmux attach -t op-agents-N` lets you tab through every running agent in one UI. The N-sessions workaround requires attaching by session name or a purpose-built picker.
- **iTerm native-tabs integration.** `tmux -CC` makes tmux windows show up as iTerm tabs. The non-orchestrator launch path (`terminalLaunch.ts:269–300`) depends on it. No zellij analogue exists or is on the roadmap.
- **OSC 2 host-title forwarding.** iTerm's window/tab title currently shows the issue title via the per-pane OSC 2 emit. Zellij owns the title and won't forward; we'd lose the ability to set the iTerm chrome from inside the pane.
- **Existing investment.** The iTerm WS driver (`iterm/*`, ~1.5k LoC + ~520 LoC tests + ~19k LoC generated proto) is recent, well-tested, and the project's largest single subsystem. Discarding it has a concrete sunk-cost-but-also-sunk-knowledge component the team should weigh consciously.
- **WORKFLOW.md observability ergonomics.** The "Per-child loop" section in `WORKFLOW.md` is built on `tmux capture-pane -t op-agents-N:OP-N` — short, memorized, fast. The zellij analogue (`zellij --session op-agents-N action dump-screen --pane-id terminal_M`) is longer and requires resolving the pane id. Manageable, but a tax.

---

## What we'd gain

- **~2.2k LoC of source deleted** (orchestrator + iterm/* + tmux observability glue), plus ~19k LoC of generated protobuf types — assuming role (c). An additional ~1.1k LoC of test files (523 iterm + 564 orchestrator) would also be shed.
- **Drop iTerm dependency.** Users could run on Terminal.app, kitty, ghostty, alacritty, wezterm. Today's `terminalApp` setting becomes a no-op.
- **Drop AppleScript dependency entirely.** OP-154's whole motivation evaporates.
- **Drop the dual-host model.** Today each agent is a tmux window inside an iTerm pane that runs a view script that grouped-attaches into another tmux session. That's three layers. Zellij collapses to one.
- **First-class per-pane-id targeting** (`dump-screen --pane-id`, `focus-pane-id`, `--tab-id`). The probe shows it works headless. tmux's targeting is comparable but the zellij API is more uniform.

---

## Interaction with OP-154 / OP-155

- **OP-154** (migrate `terminalLaunch.ts` off AppleScript onto the iTerm WS wrapper). **Not affected by this verdict.** Even if we eventually go zellij, OP-154's work makes the existing stack better in the meantime, and the WS driver it leans on is already shipped. Recommend OP-154 proceeds as planned.
- **OP-155** (background-launch + cross-app focus return + iTerm prefs Notice). **Not affected.** Same reasoning.

**Does OP-154 landing tip the cost calculus toward REJECT?** The concern is: completing OP-154 deepens the iTerm WS investment, making the eventual cost of switching away from it higher, and therefore making HOLD harder to flip to RECOMMEND when the revisit triggers fire. The counter-argument: the iTerm WS driver (~1.1k LoC source + 523 LoC tests) already exists — OP-154 is *using* it, not growing it substantially. The marginal increase in switching cost from OP-154 landing is small relative to what's already on disk. If anything, OP-154 removes the higher-friction AppleScript surface; the WS driver is the clean layer the team would prefer to keep as long as iTerm is the host. So OP-154 does not materially change the HOLD threshold. If the verdict ever flips to recommend, OP-154's iTerm WS work is the one subsystem that gets discarded — a small, bounded cost, not a stranded investment.

If a future verdict flips to recommend, OP-154's work is the most discardable surface — but that's a small price for the bridge it provides today.

---

## Probe artifacts

The probe script and its full transcript live in `/tmp/op-168-probe/` on the author's machine (probe-only artifacts, not checked in). The transcript covers steps 0–16:

- **0–3.** Headless create + 2x3 layout injection (`zellij attach -b`, `action new-tab -l`).
- **4–6.** `list-tabs`, `list-panes`, regex extraction of pane ids by KDL pane name.
- **7.** `dump-screen --pane-id` of cell-0 with focus on default tab — works.
- **8–9.** `focus-pane-id` + `write-chars` + Enter (`write 13`).
- **10.** Focus-independent dump of cell-5 — works.
- **11.** Out-of-band `action new-pane` returning `terminal_7`.
- **13.** `action list-clients` headless — empty result; session is alive without any client.
- **14.** `has-session` analogue (`list-sessions -s | grep -Fxq`) — OK.
- **15.** Cross-tab spawn via `--tab-id` returning `terminal_8` — works.
- **16.** Clean `kill-session`.

The transcript is reproducible: `bash /tmp/op-168-probe/probe.sh` against zellij 0.44.1 on macOS.

---

## Why not "reject"?

A reject would say "the technology is wrong for the problem". The probe shows the opposite — the orchestration primitives map cleanly. The reasons not to migrate today are timing (CLI surface is 3 weeks old), one structural feature gap (multi-client mirror), and one quality-of-life loss (tmux-CC iTerm tabs). None of those are "wrong technology"; they're "wrong moment."

**REJECT is a defensible call.** If the team's policy is "no pre-1.0 dependencies for core infrastructure that hosts production agent work," this PR's verdict should be REJECT, not HOLD — because "hold" implies active monitoring for a condition that might close the gap, while "reject" means "the decision is made; reopen from scratch if circumstances change materially." The difference matters for cognitive overhead. The reason this verdict is HOLD rather than REJECT: the technology direction is sound, the architectural simplification is real, and the multi-client mirror gap (the one structural blocker) is a *tracked* open issue — not a roadmap gap or a design choice the zellij team has explicitly decided against. If #4253 closes, a migrate decision should be fast to revisit. REJECT would require a fresh research doc from scratch; HOLD preserves this assessment as the standing context.

**This is a long hold, not a 6-month hold.** Given the 0.44 surface age and pre-1.0 status, the earliest realistic "re-evaluate" window — even if #4253 closes quickly — is probably 12–18 months from now (post-1.0, 6+ months of CLI stability). Anyone reading this doc in the next year with "maybe we should look at zellij again?" should check whether the revisit triggers at the bottom of this doc have fired, not whether a few months have passed.

## Why not "recommend"?

The mirror gap is structural. The current per-pane-viewer pattern is genuinely useful and not trivially replaceable. Pre-1.0 software with a brand-new automation surface is the wrong base for a multi-week migration that, if it ships, deletes ~2.2k LoC and replaces three integration points at once.

## Revisit triggers

Open this doc again when **any** of:

1. Zellij ships independent-per-client tab focus (issue [#4253](https://github.com/zellij-org/zellij/issues/4253) closed and released).
2. Zellij ships a tmux-CC-style structured event/control protocol (no tracking issue today; would need to be filed).
3. Zellij hits 1.0 and the 0.44 CLI surface stabilizes for 6+ months without breaking changes.
4. We consciously decide we don't need the per-pane viewer pattern (e.g., because OP-149's brain-stormed UX moves agents into Obsidian-side panes).
