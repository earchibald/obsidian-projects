---
id: orient
title: Orient yourself before touching code
type: workflow-module
scope: kickoff
order: 0
---

You're working on **{{id}}** ({{title}}) on branch `{{branch}}`. Read the
issue note before doing anything else. Confirm the scope, scan for prior
commits or open PRs on this branch, and surface any ambiguity in the
requirements before writing code.

If the scope section is empty or one line, treat it as ambiguous — state
your interpretation and ask for confirmation before implementing, even
when running in auto mode. The cost of a 30-second confirm is far below
the cost of building the wrong thing.
