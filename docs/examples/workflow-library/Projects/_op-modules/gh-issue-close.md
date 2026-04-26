---
id: gh-issue-close
title: GitHub issue close on resolve
type: workflow-module
scope: finalize
order: 20
vars:
  - { name: auto_close_setting_path, default: "closeGithubIssueOnResolve", description: "Plugin settings key (or dotted path) that controls whether op-resolve also closes the linked GH issue." }
---

If this issue mirrors a GitHub issue (the issue note has a
`github_issue:` URL), do **not** close the GH issue manually before
running `op-resolve`. The plugin closes it atomically as part of the
resolve transition when its `{{vars.auto_close_setting_path}}` setting
is on, and a manual close beforehand makes the JSON response confusing
("`githubClosed: true`" vs. "already closed by user").

After running `op-resolve`, read the JSON payload at
`Projects/_scratch/op-last-response.md` and check `githubClosed` and
`githubCloseError`. Don't try to predict what the setting is set to —
agents semi-consistently misread it (in this codebase the flag lives
under `settings.github`, not the top level, and a wrong-path probe
returns `=> {}` which looks like "off"). Read the actual response
instead, and report what happened.

If `githubCloseError` is set, retry the close manually
(`gh issue close <url>`) and surface the error to the user.

Skip this rule for projects without a GitHub remote, or for issues that
don't carry a `github_issue:` URL.
