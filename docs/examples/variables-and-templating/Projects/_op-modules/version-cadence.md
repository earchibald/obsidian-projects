---
id: version-cadence
title: Version bump cadence
type: workflow-module
scope: kickoff
order: 20
vars:
  - "package_name=op-obsidian"
---

After every change to `plugins/{{vars.package_name}}/`, run
`node scripts/bump-version.mjs <patch|minor|major>` so the manifest,
package, and plugin JSON files move in lockstep. Pick the bump level by
judgment: patch = fix, minor = additive, major = breaking. Today is
{{today}}.

`{{vars.package_name}}` defaults to `op-obsidian` via the
`name=VALUE` shorthand in this module's `vars:` block — set
`vars.package_name` at the global, project, or launch scope to point the
rule at a different package without forking the module.
