---
doc_type: spec
issue: OP-29
status: draft
---

# OP-29 — Community plugin store submission checklist

Reference: https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin

## Repo-level

- [ ] `manifest.json` — verify `id`, `name`, `description`, `author`, `authorUrl`, `fundingUrl` (optional), `isDesktopOnly` (set true — we shell out to tmux/terminal apps), `minAppVersion`.
- [ ] `versions.json` — add a row for each `manifest.json` version that bumped `minAppVersion`.
- [ ] LICENSE — confirm MIT (matches `package.json`).
- [ ] README.md — top-level install / usage section. Current README needs a community-store-facing rewrite: what it does, screenshots, settings overview, known limitations (macOS-only agent launcher).
- [ ] `main.js`, `manifest.json`, `styles.css` committed or shipped via GitHub release assets.

## GitHub release

- [ ] Tag matches `manifest.json` version exactly (no `v` prefix — the reviewer bot is strict).
- [ ] Release assets: `main.js`, `manifest.json`, `styles.css`.
- [ ] Release notes summarise user-visible changes.

## Screenshots (for README + submission PR)

Capture in a light + dark theme:

- [ ] Sidebar view — Issues tab populated.
- [ ] Sidebar view — In flight tab.
- [ ] Sidebar view — Recently resolved tab.
- [ ] Command palette filtered to `op:` commands.
- [ ] Settings panel showing the Agents + Sidebar view sections.
- [ ] An example Project folder with STATUS.md + base dashboard.

Target: 1440×900 @ 2x, PNG, cropped to the relevant UI.

## Description (draft)

> **op** is an opinionated, Jira-lite issue tracker that lives inside your vault.
> Scaffold projects, create issues with structured frontmatter, track work on a
> sidebar with Issues / In flight / Recently resolved tabs, and (optionally on
> macOS) launch a coding agent in a tmux session scoped to each issue.

150-char short description for the community list:
> Lightweight project + issue tracker inside your vault, with a sidebar for open / in-flight / resolved work and optional agent launcher.

## Review checklist (mirrors obsidianmd/obsidian-releases bot)

- [ ] No `var` — only `let`/`const`. (current source: verified)
- [ ] No `innerHTML`/`outerHTML`/`insertAdjacentHTML` with untrusted input. (we use `createEl`/`createDiv`)
- [ ] No hard-coded dark/light colours — all styles use CSS variables from Obsidian's theme. (verified in `styles.css`)
- [ ] No `console.log` in hot paths; `console.debug` / `console.error` are fine.
- [ ] No network calls without user action and clear disclosure. (plugin is fully local)
- [ ] All event listeners / intervals cleaned up in `onunload` or `Component` lifecycle. (store uses `Component`; view unsubscribes in `onClose`)
- [ ] `registerEvent` / `registerDomEvent` where applicable. (followup — sidebar view tab-click listeners currently use `addEventListener`; fine because `contentEl` is emptied on `onClose`, but consider migrating for consistency)
- [ ] Settings persisted via `loadData`/`saveData`. (verified)
- [ ] Plugin id, name, description match across `manifest.json` and community-plugins PR entry.

## Submission PR

- [ ] Fork `obsidianmd/obsidian-releases`.
- [ ] Add entry to `community-plugins.json` (alphabetical, see format in existing entries).
- [ ] Open PR; respond to bot feedback; wait for manual review.

## Open decisions before first submission

- **Plugin name in store.** Currently `op-obsidian` (id). Display name TBD — something clearer like "op — projects & issues".
- **Desktop-only?** Yes — the agent launcher shells out to `tmux` + Terminal/iTerm via AppleScript. Document this limitation in the README and flag `isDesktopOnly: true`.
- **Scope of first release.** Ship the issue/task/sidebar surface. Agent-launcher stays but is documented as macOS-only.
