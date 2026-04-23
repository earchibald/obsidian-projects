# OP-101 — Replace AppleScript iTerm driver with native TS WebSocket client

**Status:** In progress (Step 1 landed)
**Effort:** ~3.5 dev-days hands-on + 1-week soak
**Author:** @earchibald · 2026-04-22

## Motivation

`plugins/op-obsidian/src/iterm/applescript.ts` drives iTerm2 via `osascript`. That has been flaky in practice:

- Silent failures (exit 0 with no side effect)
- Nested-scan races when multiple orchestrator ops run in overlapping scripts
- `name of window` regressed to read-only in recent iTerm builds
- Every op forks a shell

iTerm2 ships a documented WebSocket+protobuf API on a local socket. A native TS client gives us:

- A long-lived connection (no per-op subprocess cost)
- Real typed error codes (no string-scraping osascript stderr)
- Push notifications (session-closed, etc. — used later for eviction)
- No Python interpreter dependency

**Rejected alternative:** subprocess+venv Python bridge using the `iterm2` PyPI package. Inherits macOS `python3` absence, arm64/x86 wheel mismatches, corporate-proxy `pip install` failures. Still needs one AppleScript call for the auth cookie. Net no win.

## Wire protocol, pinned

- Port: `~/Library/Application Support/iTerm2/private/.iterm2_api_port` (ASCII int, possibly trailing `\n`)
- URL: `ws://localhost:<port>/`, subprotocol `api.iterm2.com`
- Headers (or subprotocol when Electron's `WebSocket` can't set headers): `x-iterm2-cookie`, `x-iterm2-key`, `x-iterm2-library-version`, `origin`
- Auth cookie/key pair obtained via AppleScript: `tell application "iTerm2" to request cookie and key for app named "op-obsidian"` — one-shot, cached via Electron's `safeStorage`
- Binary frames; each frame is a `ClientOriginatedMessage` or `ServerOriginatedMessage` proto with a `u32 id` used for reply multiplex
- User must have enabled **Settings → General → Magic → Enable Python API**; we detect auth failure on first connect and surface a settings-link error

Proto is vendored from `gnachman/iTerm2` at commit `9be6cc9e95a2933f83bc1935fb345d0c456c373c` (see `plugins/op-obsidian/src/iterm/proto/README.md`). Regenerate only when we need new fields — protobuf2 is backward-compatible.

## Current surface (all in `src/iterm/applescript.ts`, 206 LOC)

| Legacy fn | Request message |
| :-- | :-- |
| `createWindow` | `CreateTabRequest` |
| `splitSession` | `SplitPaneRequest` with `custom_profile_properties[Command=…]` |
| `setSessionName` / `setWindowName` | `SetPropertyRequest` |
| `selectSession` | `ActivateRequest{select_session, select_tab, order_window_front}` |
| `sessionExists` | `ListSessionsRequest` + membership |
| `buildLayoutWindow`, `applySplit` | composites over the primitives, one connection |

Call-sites: `orchestrator.ts`, `terminalLaunch.ts`, `openAgent.ts`, `revealAgentSession.ts`, `layout/engine.ts`. All depend on the TS signatures only — AppleScript semantics don't leak through the interface.

## File layout

```
plugins/op-obsidian/src/iterm/
  applescript.ts            # legacy, kept behind flag for one release
  client.ts                 # new, same exported signatures as applescript.ts
  transport.ts              # WS connection + framing + pending-RPC map + reconnect
  cookie.ts                 # one-shot AppleScript cookie acquisition + port read
  proto/
    api.proto               # vendored MIT; pinned commit
    api.generated.js        # pbjs static-module CJS output
    api.generated.d.ts      # pbts typings
    README.md               # pin + regen recipe
```

## Staging

Each step ships a release.

- **Step 1 (landed in this PR).** Plumbing. Vendor proto + pbjs static codegen. `cookie.ts`, `transport.ts`, `client.ts` (stubs throwing `notImplemented`). `useWebSocketClient` flag in settings, default **off**. Unit-test cookie parse + proto round-trip. No caller changes.
- **Step 2.** Port `sessionExists` only. Settings-tab toggle exposed. Manual smoke via `revealAgentSession` with flag on. If iTerm's renderer-`WebSocket` path rejects cookie-in-subprotocol, fall back to Node `ws` for that call (confirms the transport abstraction works).
- **Step 3.** Port write ops (`createWindow`, `splitSession`, `setSessionName`, `selectSession`) and composites (`buildLayoutWindow`, `applySplit`). Keep `setWindowName` best-effort (mirror the existing try/warn). Orchestrator + terminal-launch callers read the flag once per run and pick a module.
- **Step 4.** Flip default **on**, ship a release, soak ~1 week.
- **Step 5.** Delete `applescript.ts` and `runOsa`; keep only the one-shot cookie call in `cookie.ts`. Drop the `useWebSocketClient` flag — WebSocket becomes the only path.

## Risks + mitigations

| Risk | Mitigation |
| :-- | :-- |
| Proto churn | Pinned commit SHA in `proto/README.md`; add a min-iTerm-version note to `manifest.json` before Step 4. |
| First-run cookie prompt UX | Add a settings-tab explainer + "Test iTerm connection" button in Step 2. |
| API-disabled error path | Transport's open-error surfaces a message linking the Magic pane. |
| Connection cleanup on `onunload` | Leverage the OP-67 event-bus drain pattern; register transport `close()` in a disposable. |
| Bundle size | Static codegen ~40KB gzipped; current pbjs output ~48KB JS raw. Acceptable. |
| Electron renderer `WebSocket` can't set arbitrary request headers | Fall back to encoding cookie into subprotocol, or drop to Node `ws` (transport already factory-pluggable). Decision deferred to Step 2. |

## Open questions

- Singleton `ITermClient` vs per-run instance. Leaning singleton (keeps the connection warm; `ListSessions` + notifications want one pipe). Default to singleton, revisit if tests prove hard.
- Subscribe to `NotificationRequest` for session-closed eviction? Deferred — currently the orchestrator polls via `sessionExists`.
- Hand-rolled WS frame parser vs dep. Not worth it; Electron's native `WebSocket` + factory-pluggable transport gets us there.

## Acceptance criteria

- All 8 functions in `iterm/applescript.ts` ported to `iterm/client.ts` with identical signatures and test coverage.
- Zero `osascript` calls during steady-state orchestrator use. Exactly one AppleScript call at first connect for cookie acquisition, gated by cached credential.
- `applescript.ts` deleted by close of Step 5; no `execFile("osascript", …)` outside `cookie.ts`.
- `npm run build` + the `CLAUDE.md` smoke test pass with the flag default-on (Step 4+).
