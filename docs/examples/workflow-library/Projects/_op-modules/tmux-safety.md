---
id: tmux-safety
title: Tmux safety — never target shared sessions
type: workflow-module
scope: kickoff
order: 20
vars:
  - { name: protected_session_prefixes, default: "op-agents-,view-", description: "Comma-separated list of tmux session-name prefixes that must never receive destructive commands." }
  - experiment_session_pattern=op-experiment-$$
---

When experimenting with tmux — installing hooks, killing windows,
overriding options — **never** target a session whose name starts with
any of `{{vars.protected_session_prefixes}}`. Those sessions host live
agent state; a mis-targeted `kill-session` or `set-hook` wipes every
parallel agent's window and forces a multi-agent restart.

Rules:

- **Experiment in a disposable session you created yourself.** Use a
  name that cannot prefix-match any protected prefix — the convention is
  `{{vars.experiment_session_pattern}}` (the `$$` expands to your shell
  PID, so each experiment is in its own session). Tear it down with
  `tmux kill-session -t =<your-name>` (the `=` forces exact match).
- **Use exact-match `=name` targets in any tmux command you run.**
  Without `=`, tmux session/window names match by prefix —
  `kill-session -t view-X` would silently match `view-X-something-else`
  if both exist.
- **Read shared state, don't mutate it.** `tmux list-sessions`,
  `tmux list-windows -a`, `tmux show-hooks`, `tmux show-options` are
  safe. `kill-*`, `set-hook`, `set-option`, `rename-*` against shared
  targets are not.
- **For automated tests, use the orchestrator's pure-function exports**
  with a stubbed tmux binary. Never drive real tmux from a unit test.

If you accidentally take down a shared session, surface the failure to
the user immediately — don't try to silently restart agents to cover for
it. Recovery is "every affected agent restarts; uncommitted work in
those agents' worktrees is what's still on disk."
