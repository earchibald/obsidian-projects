---
id: version-cadence
title: Version bump cadence
type: workflow-module
scope: finalize
order: 10
vars:
  - package_name=op-obsidian
  - bump_command=node scripts/bump-version.mjs
---

Every issue that ships code bumps the project's version file in
lockstep — one bump per issue, recorded as `version:` on the issue note.

Run from the repo root:

```
{{vars.bump_command}} <patch|minor|major>
```

The script for this project moves
`plugins/{{vars.package_name}}/manifest.json`,
`plugins/{{vars.package_name}}/package.json`, and any matching
`.claude-plugin/plugin.json` together so the three never drift.

Pick the bump level by judgment:

- **patch** — docs, bug fixes, internal refactors.
- **minor** — new user-facing behavior (new command, new optional field,
  additive arg).
- **major** — breaking change (removed/renamed field, removed verb,
  schema migration). Confirm with the user before bumping major.

Pre-`1.0.0` projects MAY treat breakage as minor; prefer explicit major
once the schema stabilizes. Skip entirely for meta-only projects with no
version file.

Override `vars.package_name` in your project's `STATUS.md` `vars:` block
to point this rule at a different package without forking the module.
