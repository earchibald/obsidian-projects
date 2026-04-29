# Agent dashboard in iTerm browser tab — product spec

> Source: OP-217. Vetted product spec for the agent dashboard. Implementation is tracked in seven child issues (see "Implementation tracking" below).

## Why

Today, observing or steering N concurrently-running coding-agent sessions means: list tmux windows in your head, switch to each iTerm pane in turn, read scrollback, type into the focused pane, repeat. The orchestrator skill's "poll every 5 minutes" loop captures one snapshot per session per cycle and offers no way to act without a context switch. As soon as you launch more than two parallel agents, the cognitive cost of "which one needs me right now?" dominates.

iTerm2 3.6 (Sep 2025) ships an in-app `WKWebView` browser tab, installed via the separate `iTermBrowserPlugin-1.0.zip` component (or `brew install --cask itermbrowserplugin`). That gives us a place to put a real, live, web-based dashboard *inside the same window* the user already has open for terminal work — no second app, no second window manager, no second focus mode. The dashboard's job is to collapse "scan all my agents" into a single glance and "act on one of them" into a single click.

**Key objectives (verbatim from OP-210):** Useful. Easy to use.

## Scope

This spec ships:

1. A long-lived Python AutoLaunch daemon that brokers between the iTerm2 Python API, tmux, and a localhost web server.
2. A single-page web dashboard served by that daemon, designed to load in an iTerm2 browser tab (with Safari as a graceful fallback).
3. A new `op-dashboard` plugin command + URI handler that opens the dashboard in an iTerm2 browser tab.
4. Plugin-side instrumentation that tags every launched agent session with its `op` issue id at both the iTerm and tmux layers, so the daemon can correlate without out-of-band state.
5. A new "Dashboard" subsection in the op-obsidian Settings tab.

Out of scope for v1 (deferred to follow-ups):
- Cross-machine sync. Dashboard is local-host only.
- Persistent telemetry / history beyond what's in tmux scrollback.
- Multi-user auth — single-user dev tool, single-machine token.
- Dashboard for non-`op-launched` tmux sessions.
- Codex/Copilot/Cursor support beyond a stub agent profile (Claude Code is the v1 target).

## Architecture

### High-level diagram

```
┌──────────────────┐  WebSocket  ┌──────────────────────────┐  Python API ┌────────┐
│ iTerm browser tab│◀───────────▶│ op-dashboard.py (daemon) │◀──────────▶│ iTerm2 │
│  (or Safari)     │   /ws       │  AutoLaunch, aiohttp     │             └────────┘
└──────────────────┘             │  127.0.0.1:<port>        │  shell exec ┌────────┐
        ▲                        │                          │◀──────────▶│  tmux  │
        │ HTTP GET /             │                          │  capture/   └────────┘
        └────────────────────────┤                          │  send-keys
                                 └──────────────────────────┘
```

### Why not a JS bridge inside the browser tab?

iTerm2's WKWebView tab does not expose a public JS bridge to the iTerm2 process. We checked release notes, the Python API docs, the browser-feature documentation, and HN discussion threads (3.6 launch and beyond) and found no documented `window.iterm2`, `window.webkit.messageHandlers.iterm`, or postMessage protocol. Building on an undocumented private channel would lock us to specific iTerm builds and break silently on upgrade. The HTTP/WebSocket path uses entirely public, stable APIs.

### Why a Python daemon, not a Node/TypeScript server?

The iTerm2 control protocol is exposed exclusively through the official `iterm2` Python package. Reimplementing the protobuf wire format in TypeScript is possible but not justified — the daemon is a control plane, not a hot path, and the Python ecosystem (`aiohttp`, `websockets`, `asyncio`) is well-suited. The daemon is small (target: ≤ 800 LOC) and ships separately from the plugin's TypeScript build.

### Daemon location and lifecycle

`~/Library/ApplicationSupport/iTerm2/Scripts/AutoLaunch/op-dashboard.py`. iTerm2 starts it on launch and restarts it whenever iTerm2 restarts. The daemon does **not** auto-restart on its own crash in v1 — the dashboard surfaces a "disconnected" state and the user restarts iTerm to recover. v2 may ship a `launchd` LaunchAgent for daemon supervision; not required for v1.

The daemon is **opt-in.** First-time setup is initiated by the user running `op-dashboard` (palette or URI). If neither the iTerm browser plugin nor the daemon is detected, the plugin opens a Setup modal that:

1. Detects whether `iTermBrowserPlugin` is installed; if not, links to `brew install --cask itermbrowserplugin` with a copy-to-clipboard button.
2. Detects whether `op-dashboard.py` exists in `~/Library/ApplicationSupport/iTerm2/Scripts/AutoLaunch/`; if not, offers an "Install daemon" button that installs the bundled daemon payload plus `client/index.html` into that folder and prompts the user to restart iTerm2.
3. Detects whether the daemon is running on its configured port; if not, instructs the user to restart iTerm2 (or to run the daemon manually for one session via the `Run` menu in iTerm Scripts).

We never silently drop a Python file into the user's iTerm Scripts folder.

### Authentication

The daemon binds to `127.0.0.1:<port>` only (default port: `49217`, configurable in Settings). Every WebSocket frame and every HTTP request must carry a token query-parameter or `X-Op-Token` header. The token is regenerated on daemon startup and persisted to a 0600-mode file at `~/Library/ApplicationSupport/iTerm2/Scripts/AutoLaunch/op-dashboard.token`. The plugin reads that file at `op-dashboard` invocation time and embeds the token in the URL it opens. Other local processes running as the same user can read the token file — that is acceptable for a single-user dev tool; we are not defending against malicious local code.

## Data model

### Per-session record

The daemon maintains an in-memory map keyed on issue id. Source of truth for membership is "the union of (iTerm sessions tagged with `user.op_issue`, tmux windows under any `op-agents-*` session, surfaces recorded in `data.json` under `orchestratorState`)."

```python
@dataclass
class AgentSession:
    issue_id: str            # "OP-217"
    iterm_session_id: str | None   # WKWebView session UUID
    tmux_target: str          # "op-agents-1:OP-217" (session:window)
    agent_id: str             # "claude" | "codex" | "copilot" | ...
    model: str | None         # "claude-sonnet-4-6" — best-effort
    context_pct: int | None   # 0-100 — best-effort scrollback heuristic
    state: Literal["running", "waiting_user", "waiting_review", "idle", "exited"]
    last_activity: datetime   # last time scrollback bytes changed
    last_capture: str         # tail-50 of scrollback (UTF-8 stripped)
    started_at: datetime
    workdir: str | None
```

### Identity correlation

Issue id is the primary key. To correlate it with iTerm and tmux:

- **iTerm side:** at launch, `terminalLaunch.ts` emits an OSC 1337 `SetUserVar=op_issue=<base64-encoded-issue-id>` once the agent shell starts. The daemon discovers it via `await session.async_get_variable("user.op_issue")` and via the existing `async_subscribe_to_new_session_notification` event.
- **tmux side:** the launched agent already runs inside `op-agents-N:<sanitized-issue-id>` (per `tmuxWindowName(issueId)` in `terminalLaunch.ts`). The daemon enumerates tmux windows with `tmux list-windows -a -F '#S:#W'` and reverse-maps to issue ids via the same sanitization.

The daemon reconciles both views on start and on every layout-change notification. If they disagree (iTerm has a session tagged for an issue whose tmux window is gone, or vice versa), the row is shown with a "stale" badge — same convention as the plugin's existing stale-agent badges.

### State classification

The dashboard's "state" column is a heuristic derived from scrollback + tmux liveness, **not** a ground-truth from the agent process:

- `running` — last scrollback delta in the last 30 s.
- `waiting_user` — pane shows a Claude Code "do you want to" prompt or any of: a `❯ ` input box with no spinner, a `(yes/no)` line, an `Approve?` line. Per-agent regex set, extension point.
- `waiting_review` — pane shows the orchestrator's `Polling for Copilot review (attempt N/M)` line or any "polling" sentinel from the workflow (per the existing parent-issue orchestration pattern).
- `idle` — no scrollback delta in 30 s but tmux window still alive.
- `exited` — tmux window gone (caught via terminate-session notification or list-windows poll miss).

These classifications are best-effort. The dashboard renders the raw last-30-lines tail under each row so the user can sanity-check the badge.

## UI

### Layout

A single-page React (or vanilla — implementer's call) app served at `/`. Layout:

```
┌─ op dashboard ──────────────────── connection: ● live  port 49217 ─┐
│                                                                    │
│  filter: [all ▾]  [running ▾]  [needs me ▾]    sort: by activity ▾ │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ ● OP-217  Agent dashboard spec       claude-sonnet-4-6  ctx 38%││
│  │   running · 4m ago · /Users/.../OP-217                         ││
│  │   ▸ … last 3 lines of pane tail …                              ││
│  │   [send: ____________________ ⏎]  [/quit]  [close pane]  [↗]   ││
│  └────────────────────────────────────────────────────────────────┘│
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ ⏸ OP-216  Worked-example library     claude-sonnet-4-6  ctx 81%││
│  │   waiting_user · 12m ago                                       ││
│  │   ▸ Do you want to overwrite plans/OP-216-spec.md? (y/n)       ││
│  │   [send: y______________________ ⏎]  [/quit]  [close]    [↗]   ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

Status dots: `●` green = running, `⏸` amber = waiting_user / waiting_review (needs me), `◯` grey = idle, `✕` red = exited (with retain-in-list grace period of 5 min so the user can read the final scrollback). Visual treatment is a small, dense table — not Material cards. Density target: 6–8 rows visible at MacBook 13" without scroll.

### Per-row controls

- **Send box.** Free-text input + Enter submits. Sent via `tmux send-keys -t <target> -l "<text>"` then `tmux send-keys -t <target> Enter`. The Claude Code "two-Enter quirk" (per project memory) is handled daemon-side: after the first Enter, the daemon captures the pane; if the message is still in the input box and there's no spinner, it sends a second Enter automatically.
- **`/quit` button.** One click → confirm modal ("This will end the agent session for OP-NNN. Continue?") → `tmux send-keys -t <target> "/quit" Enter Enter`. Does not close the pane (the agent's own `/quit` cleanup handles teardown of its worktree).
- **Close pane button.** Closes the iTerm pane via `await session.async_close(force=True)`. Does *not* kill the tmux window — the user might want to detach without terminating the agent. To kill the tmux window separately, the dashboard offers a "Kill tmux window" item under a `…` overflow menu (with confirm).
- **`↗` (open pane in iTerm).** Brings iTerm to the foreground and selects the pane that owns this session — uses the existing `revealAgentSession()` path the plugin already implements; daemon shells out to `obsidian://op-attach-current?id=<issue-id>` so the existing logic is reused.

### Header

- Connection indicator: ● live / ◯ disconnected / ⚠ token-mismatch.
- Port and link to the Settings tab.
- Filter chips for state.
- Sort dropdown: by activity (default) | by issue id | by start time | by needs-me-first.

### Empty state

"No agents running. Launch one with `op-open-agent` or by clicking the chip on an issue note." Includes a small "How this works" link to the dashboard docs in `DOCS/superpowers/`.

### Disconnected state

If the WebSocket drops, the dashboard freezes the last-known state (greyed out), shows a banner "Disconnected from daemon — restart iTerm2 to recover", and tries to reconnect every 5 s for 60 s before giving up.

## Server contract

### HTTP

| Path | Method | Purpose |
|---|---|---|
| `/` | GET | Serves the SPA HTML/JS/CSS. |
| `/healthz` | GET | Returns `{"ok": true, "version": "...", "uptime_s": N}`. Used by the plugin to detect if the daemon is alive. |
| `/ws` | WebSocket upgrade | The single bidirectional channel for state + commands. |

### WebSocket frames

All frames are JSON. Token is required on the upgrade URL: `/ws?token=<token>`.

**Server → client:**

```json
{"type":"snapshot","sessions":[<AgentSession serialized>, ...]}
{"type":"session_added","session":<AgentSession>}
{"type":"session_updated","session":<AgentSession>}
{"type":"session_removed","issue_id":"OP-217"}
{"type":"capture","issue_id":"OP-217","tail":"<last-50-lines>"}
{"type":"error","code":"...","message":"..."}
```

**Client → server:**

```json
{"type":"send","issue_id":"OP-217","text":"y"}
{"type":"quit","issue_id":"OP-217"}
{"type":"close_pane","issue_id":"OP-217"}
{"type":"reveal","issue_id":"OP-217"}
{"type":"refresh","issue_id":"OP-217"}
```

The server pushes a `snapshot` on connect, then deltas. The client may send `refresh` to force a re-capture of one session. There is no per-message ack — commands are fire-and-forget; the next `session_updated` reflects the result. If a command errors, the server sends a single `error` frame with the failing `issue_id` and a human-readable message.

## Plugin-side changes

### New command + URI handler

```ts
this.addCommand({
  id: "op-dashboard",
  name: "OP: Open agent dashboard",
  callback: () => openDashboard(this.app, this.settings),
});
this.registerObsidianProtocolHandler("op-dashboard", () =>
  openDashboard(this.app, this.settings),
);
```

`openDashboard` performs the setup-detection logic above (browser plugin installed? daemon installed? daemon running?). On the happy path it:

1. Reads the token from `~/Library/ApplicationSupport/iTerm2/Scripts/AutoLaunch/op-dashboard.token`.
2. Builds `http://127.0.0.1:<port>?token=<token>`.
3. Either (a) opens an iTerm browser tab via the iTerm WebSocket driver (`createTab(<browser-profile>, { url })`), or (b) falls back to `window.open(url)` which goes to the system browser. The plugin setting "Dashboard target" controls the preference; default is `iterm-browser-tab`.

### New launch-side instrumentation

In `terminalLaunch.ts`, immediately after the agent shell is launched:

```ts
// emit OSC 1337 SetUserVar=op_issue=<base64> so the iTerm session is tagged
const b64 = Buffer.from(issueId, "utf8").toString("base64");
process.write(`\x1b]1337;SetUserVar=op_issue=${b64}\x07`);
```

(The exact write path depends on whether we already have a hook into the launched shell's stdin; alternative: write a 1-line helper into the agent's `--init-file` / preexec hook that the orchestrator already controls.)

### New settings subsection

Add to `SectionId` enum in `settings.ts` and render under Advanced:

```
Dashboard
  Port                 [49217          ]
  Open in              ( ) System browser
                       (●) iTerm browser tab
  Daemon status        ● Running (uptime 1h 23m) [Restart] [Logs]
  Token                ●●●●●●●●●●●●●●●● [Regenerate] [Copy URL]
  Install daemon       [Install/upgrade op-dashboard.py]
```

The "Logs" button reveals the daemon's stderr log path (`~/Library/Logs/op-dashboard.log` — daemon writes here via standard Python logging).

### Layout registry extension

Add to `SurfaceRef` in `layout/registry.ts`:

```ts
interface AgentMetadata {
  model?: string;
  contextWindowSize?: number;
  startTime: number;       // epoch ms
  workdir?: string;
}
```

The orchestrator already knows agent + workdir at launch; model + context window come from the resolved profile. Persisted to `data.json` so the daemon can pull a snapshot from the plugin's saved state on first connect.

## Failure modes & recovery

| Failure | Detection | Recovery |
|---|---|---|
| iTerm browser plugin not installed | `openDashboard` checks `/Applications/iTermBrowserPlugin.bundle` (or equivalent) | Setup modal with `brew` command. |
| Daemon not running | HTTP GET `/healthz` times out at 1s | Setup modal: "Restart iTerm2 to start the daemon." |
| Token mismatch (regenerated since plugin last opened URL) | WebSocket close code 4401 | Dashboard re-fetches token via plugin (deep-link `obsidian://op-dashboard-refresh-token`). |
| Daemon crash mid-session | WebSocket drops | Dashboard freezes, retries 5 s × 12, then shows static "restart iTerm" banner. |
| iTerm session tagged for issue id but tmux window gone | `tmux list-windows` poll | Row marked `exited`, shown with red dot; `[Reopen]` button calls `obsidian://op-open-agent?id=<id>`. |
| tmux window alive but iTerm session gone (user closed pane) | `async_subscribe_to_terminate_session_notification` | Row keeps state; `[Open in iTerm]` button calls `revealAgentSession`, which re-attaches to the existing tmux window in a new pane. |
| Multiple browser tabs open the dashboard | Standard | All clients receive the same snapshot/delta stream; commands from any client apply globally. No per-client UI state on the server. |
| iTerm Python API unavailable (older iTerm, API disabled in Settings) | `iterm2.Connection.async_create()` fails | Daemon logs the error and runs in tmux-only mode: dashboard renders rows from `tmux list-windows`, omits `iterm_session_id`, and disables the "Close pane" button (with tooltip explaining why). |

## Acceptance criteria

A reviewer should be able to verify all of these end-to-end:

1. **Install path.** Running `op-dashboard` on a clean machine with no browser plugin and no daemon shows the Setup modal. Following the modal's instructions and restarting iTerm produces a green "Daemon running" indicator without any further intervention.
2. **Live snapshot.** Launching three agents (e.g., `op-open-agent` for OP-XXX, OP-YYY, OP-ZZZ in three different projects) and then opening the dashboard shows three rows within 2 s of the third agent's tmux window appearing.
3. **Send command.** Typing `hello` into the send box on a row and pressing Enter results in `hello` appearing in the corresponding tmux pane within 500 ms (verifiable with `tmux capture-pane -p`).
4. **`/quit` works.** Clicking `/quit` and confirming results in the agent's `/quit` flow firing in its pane within 1 s; the row transitions to `exited` once the tmux window dies.
5. **Close pane works.** Clicking `Close pane` removes the iTerm pane within 500 ms but leaves the tmux window alive (verified with `tmux list-windows`).
6. **State classification.** Triggering a Claude Code interactive prompt (`(y/n)` style) in one of the panes flips that row to `waiting_user` within 30 s.
7. **Reveal works.** Clicking `↗` on a row brings iTerm to the foreground and selects the pane the agent is running in (existing `revealAgentSession` semantics).
8. **Disconnect/reconnect.** `kill <daemon-pid>` makes the dashboard show "Disconnected" within 5 s; restarting iTerm2 brings it back live within 10 s of restart completing.
9. **Token rotation.** Regenerating the token in Settings invalidates the existing browser tab (close code 4401) and re-opening via `op-dashboard` succeeds with the new token.
10. **No JS bridge dependency.** The dashboard works identically when opened in Safari at the same URL — verified by closing the iTerm browser tab, copying the URL into Safari, and confirming all controls function.
11. **Survives restart.** With three agents running, restart iTerm2; after iTerm2 finishes launching, opening the dashboard re-renders the same three rows (state from tmux + plugin's persisted `orchestratorState`).
12. **Daemon never silently installed.** Removing `op-dashboard.py` from AutoLaunch and re-invoking `op-dashboard` produces the Setup modal — never a silent re-install.

## Open questions for the implementer

These are deliberate gaps the implementer is expected to resolve, not ones the user must answer:

- **Bundling the SPA.** Vendor a tiny vanilla-JS UI vs. add a React + esbuild step under `plugins/op-obsidian/dashboard/client/`. Recommend vanilla unless the row count grows to where virtualization matters; the visual is dense but fundamentally a list.
- **Capture cadence.** Default 1 s tick is fine for a small number of agents but creates load with N=10+. Switch to event-driven (iTerm `screen_update_notification`) once correlation by `iterm_session_id` is reliable; fall back to polling for tmux-only mode.
- **Context-% heuristic per agent.** Claude Code prints `context: …%` in some surfaces, others don't. Ship the Claude regex in v1, leave the structure for adding Codex / Copilot regexes; the row degrades to `ctx —` cleanly.
- **Mac-only assumption.** AutoLaunch is iTerm2-specific (macOS only). Linux/Windows support is explicitly out of scope; document the assumption and exit cleanly with a clear message on non-macOS.
- **Telemetry.** None in v1. The dashboard is a control surface, not an observability product; persistent metrics are a separate concern.

## Test plan (verification before merge)

Per the project's adversarial-review policy this work is **not** bypass-eligible (new daemon, new IPC, new command, new settings, new vault interactions). Request Copilot review with these pressure-tests:

- Token leakage: can any local process bind to the same port and impersonate the daemon? (Expected: no, single-instance binding fails the second daemon.)
- Race between session creation and dashboard connect: are there race windows where a brand-new session's `op_issue` variable hasn't been set yet when the dashboard already polled for it?
- Cleanup symmetry: does closing the dashboard tab leak WebSocket connections / file handles / async tasks in the daemon?
- Hook re-entrancy: does `revealAgentSession` from the dashboard (which routes through the existing `obsidian://op-attach-current` URI) work when the orchestrator is mid-launch for the same issue?
- Param validation: does the daemon reject `send`/`quit`/`close` for unknown issue ids with a single `error` frame, not a 500?
- Schema drift: if `data.json` is from a pre-OP-217 version (no AgentMetadata fields), does the daemon degrade cleanly?
- Concurrency: two browser tabs + two send commands at the same instant — do both reach tmux without ordering bugs?

Smoke tests (per CLAUDE.md):

```bash
node scripts/bump-version.mjs minor          # additive surface → minor bump
node scripts/dev-sync.mjs
obsidian vault=OP-Test dev:debug on
obsidian vault=OP-Test dev:console clear
obsidian vault=OP-Test eval code='app.commands.executeCommandById("op-obsidian:op-dashboard")'
obsidian vault=OP-Test dev:console
# Settings probe — count daemon-status setting in the new Dashboard subsection:
obsidian vault=OP-Test eval code='(()=>{ app.setting.open(); app.setting.openTabById("op-obsidian"); document.querySelector("[data-op-section=\"dashboard\"] .op-collapsible__header")?.click(); return document.querySelectorAll("[data-op-section=\"dashboard\"] .setting-item").length; })()'
```

## Implementation tracking

Implementation is tracked in seven independent child issues, spun off from this spec:

- `OP-217.1` → daemon (`plugins/op-obsidian/dashboard/op-dashboard.py`)
- `OP-217.2` → dashboard SPA
- `OP-217.3` → `op-dashboard` palette command + URI handler + Setup modal
- `OP-217.4` → `terminalLaunch.ts` `op_issue` instrumentation
- `OP-217.5` → `SurfaceRef` / `WindowState` `AgentMetadata` extension
- `OP-217.6` → "Dashboard" Settings subsection
- `OP-217.7` → smoke + adversarial Copilot review

The actual child issue IDs (assigned by `op-new` at spin-off time) are recorded in OP-217's `## Tasks` checklist.
