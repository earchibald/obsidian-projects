# op-dashboard daemon

Long-lived Python daemon that brokers between the iTerm2 Python API, tmux,
and a localhost web server. Powers the agent dashboard described in
[`docs/specs/OP-217-agent-dashboard.md`](../../../docs/specs/OP-217-agent-dashboard.md).

This directory ships the daemon source. The plugin's Setup modal (OP-232)
installs `op-dashboard.py` plus its sibling `client/index.html` into
`~/Library/Application Support/iTerm2/Scripts/AutoLaunch/` — never silently;
the user is always prompted before the files land. iTerm2 starts the daemon
on launch and on every restart.

## Runtime requirements

- macOS (the daemon exits cleanly on other platforms)
- Python 3.11+ (uses `dataclasses` defaults, structural typing, modern asyncio)
- `aiohttp >= 3.9, < 4` — hard dep, needed for HTTP + WebSocket. When the
  plugin installs the daemon into iTerm AutoLaunch, it must land in **iTerm's
  bundled Python runtime**, not just the user's shell `pip3`.
- `iterm2 >= 2.1` — optional; the daemon falls back to tmux-only mode without it

```bash
"$HOME/Library/Application Support/iTerm2/iterm2env/versions/3.14.0/bin/python3" -m pip install 'aiohttp>=3.9,<4'
```

Both versions are pinned because the daemon ships into the user's
`AutoLaunch` directory — a major-version bump in either dep can silently
break every dashboard install. OP-232's Setup modal will surface the
version constraint when its `import` probe finds a mismatch.

The Setup modal installs the daemon assets and `aiohttp` into iTerm's bundled
runtime. If that bootstrap fails, check `~/Library/Logs/op-dashboard.log`.

## Files at runtime

| Path | Purpose |
|---|---|
| `~/Library/Application Support/iTerm2/Scripts/AutoLaunch/op-dashboard.py` | The daemon itself (copied here by OP-232). |
| `~/Library/Application Support/iTerm2/Scripts/AutoLaunch/client/index.html` | The dashboard SPA served by the daemon at `/`. |
| `~/Library/Application Support/iTerm2/Scripts/AutoLaunch/op-dashboard.token` | Auth token, regenerated on startup, mode 0600. |
| `~/Library/Application Support/iTerm2/Scripts/AutoLaunch/op-dashboard.config.json` | Optional config. Currently honors `vault_data_paths: [...]` for `data.json` discovery. |
| `~/Library/Logs/op-dashboard.log` | Rotating log (1 MB × 3 backups). |

## SPA

`client/index.html` is the dashboard UI (shipped by OP-231 — vanilla
single-file HTML, no build step). The daemon serves it at `/` via
`web.FileResponse` and falls back to an inline diagnostic placeholder if the
file is missing in dev/test setups. See the `## UI` section of the OP-217
spec for the layout contract; the SPA persists `filter` + `sort` in the URL
hash (`#filter=needs-me&sort=activity`) so reloads — and shared URLs — keep
the user's view.

To smoke-test the SPA against a local daemon without going through iTerm:

```bash
python3 plugins/op-obsidian/dashboard/op-dashboard.py --no-iterm --port 49999 &
curl -s http://127.0.0.1:49999/ | head -3   # should be the SPA <!doctype html>
TOKEN=$(cat ~/Library/Application\ Support/iTerm2/Scripts/AutoLaunch/op-dashboard.token)
curl -s "http://127.0.0.1:49999/healthz?token=$TOKEN"
kill %1
```

Open `http://127.0.0.1:49999/?token=$TOKEN` in any browser to interact with
the live UI; that is the same URL the plugin opens via the iTerm browser
tab driver, so behavior in Safari is the v1 acceptance check.

## Surface

- `GET /` — serves the SPA from `client/index.html` if present, otherwise a
  diagnostic placeholder. Unauthenticated (chrome only).
- `GET /healthz?token=…` — `{"ok": true, "version": "...", "uptime_s": N, "iterm": bool}`. **Requires token.**
- `GET /ws?token=…` — bidirectional control channel. Token-mismatch closes
  with code 4401.

WebSocket frames are documented in the OP-217 spec under "Server contract".

## Identity correlation

A live row exists when the union of these sources has the issue id:

- iTerm sessions whose `user.op_issue` user-var decodes to `<issue-id>`
  (base64-encoded by OP-233; raw fallback honored).
- tmux windows under any session matching `^op-agents(-\d+)?$`, where the
  window name is `tmuxWindowName(issueId)` =
  `slugify(issueId, { allowUnderscore: true })` (case-preserving). For
  canonical ids like `OP-217`, slug == id.
- *(opt-in)* `data.json` `orchestratorState.surfaces` if a vault path is
  pointed at via the `OP_DASHBOARD_DATA_JSON` env var or
  `op-dashboard.config.json`.

The reconciler runs on the 1 s poll loop and on every iTerm layout-change
notification.

## Fallback modes

- **No iterm2 package or API disabled.** Daemon logs once, sets
  `iterm: false` in `/healthz`, and serves rows from tmux only. The
  `close_pane` command returns an `error` frame with code
  `iterm_unavailable`.
- **No tmux server.** `list-windows` fails benignly; the daemon serves
  whatever iTerm reports (likely zero rows) until tmux is brought up.
- **Pre-OP-217 `data.json`.** Reader uses defensive `.get` chains and
  yields empty AgentMetadata rather than raising.
- **iTerm restart while tmux survives (OP-237).** When iTerm restarts
  but the tmux server is still running, the reattached pane has no
  `user.op_issue` user-var — the OP-233 OSC 1337 emit lives inside the
  inner agent script, and tmux's `select-window` reattach does not
  re-run that script. The tmux side of the correlation union still
  matches the window by name, so the live row keeps appearing.
  **Self-heal:** every `reconcile()` pass calls
  `ITermBridge.heal_untagged()`, which maps each iTerm tab's
  `tmux_window_id` (exposed by the iTerm API regardless of the lost
  user-var) back to its issue via `tmux list-windows -F
  '#{window_id}\t#S\t#W'`, then re-sets `user.op_issue` (plain id, the
  raw form `scan()` already honors) through `async_set_variable`. The
  healed session-id folds into the same cycle's `iterm_map`, so
  `close_pane` / reveal recover within one ~1 s poll — no fresh launch
  needed. Idempotent (already-tagged sessions are skipped) and a no-op
  in tmux-only mode. If the iTerm API is unavailable the row still
  works via the tmux-only path, with iTerm-targeted ops degraded as
  before.

## Testing

The pure-Python helpers ship a `unittest` suite that runs without aiohttp,
iterm2, or tmux:

```bash
python3 plugins/op-obsidian/dashboard/test_op_dashboard.py
```

End-to-end smoke (daemon up, browser tab live, send/quit/close round-trip)
lives in OP-236 — that issue gates the whole OP-217 chain's merge to main.

## Adversarial review surface

OP-236's adversarial Copilot review pressure-tests the seven failure modes
in `docs/specs/OP-217-agent-dashboard.md`:

1. Token leakage / port impersonation.
2. New-session race vs. dashboard connect.
3. Cleanup symmetry (closed tab → no leaks).
4. `revealAgentSession` re-entrancy with mid-launch orchestrator.
5. Unknown-issue param validation (single `error` frame, not a 500).
6. Schema drift on a pre-OP-217 `data.json`.
7. Concurrent send commands from multiple clients.
