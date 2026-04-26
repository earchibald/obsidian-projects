---
id: version-cadence
title: Version bump cadence
type: workflow-module
scope: kickoff
order: 20
vars:
  - "package_name=op-obsidian"
---

After every change to `plugins/{{vars.package_name}}/`, run `node scripts/bump-version.mjs <patch|minor|major>` so the manifest, package, and plugin JSON files move in lockstep. Pick the bump level by judgment: patch = fix, minor = additive, major = breaking. Today is {{today}}.
