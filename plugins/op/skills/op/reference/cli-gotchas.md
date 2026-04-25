# CLI gotchas

Quirks of the raw `obsidian` CLI that matter when the `op-obsidian` plugin is unavailable and you have to fall back to primitives.

## `obsidian search` can't query `prefix:`

`obsidian search query="prefix: <PREFIX>"` fails with `Error: Operator "prefix" not recognized` — the CLI parses a leading `<word>:` as a search operator, colliding with frontmatter keys. For prefix → slug lookups, scan `Projects/*/STATUS.md` frontmatter directly.

`obsidian search` can also fail wholesale with `ENOENT` when a single entry in the vault index points at a moved or deleted file. Recovery: restart Obsidian or force a reindex. Don't rely on `obsidian search` for correctness — use filesystem scans.

## `obsidian create` forces `.md`

For `.base` / `.canvas`, write to the vault path directly rather than via the CLI.

## `obsidian move` uses `to=`, not `dest=`

Full form: `obsidian move path=<src> to=<dst>`.

## `--help` on a subcommand creates a note

`obsidian <subcommand> --help` creates `Untitled N.md` — the CLI treats `--help` as content. Use `obsidian help` at the top level only.

## There is no `property:get` — use `property:read`

To read a frontmatter field, use `obsidian property:read name=<key> path=<vault-relative-path>`. Typing `property:get` fails with `Did you mean: property:set, property:read?` — the read verb is `:read`, not `:get`.

## There is no `property:add` / `property:append`

The CLI exposes only `property:read`, `property:set`, and `property:remove`. To append to a list-valued property (e.g. `commits:`) without the plugin, you have to read → append-in-memory → rewrite:

```bash
ISSUE="Projects/<slug>/ISSUES/<PREFIX>-<N> <title>.md"
sha=$(git -C <repo> rev-parse --short=7 HEAD)
sub=$(git -C <repo> log -1 --pretty=%s)
new="$sha $sub"

# 1. Read the current list (YAML — one "- item" per line, or empty).
current=$(obsidian property:read name=commits path="$ISSUE")

# 2. Build the new list in memory, then rewrite it whole as a JSON array.
obsidian property:set name=commits type=list \
  value='["<sha1> <subj1>","<sha2> <subj2>","'"$new"'"]' \
  path="$ISSUE"
```

This is the **fallback** for when `op-obsidian` is missing or disabled. In normal operation, `obsidian op-append-commit issue=<PREFIX>-<N> sha=<sha> subject=<subj>` is the right tool — it's idempotent, handles the read/rewrite internally, and keeps the JSON response trail.

## Body sections without a verb — use `op-set-section`

The op workflow writes three body sections on every issue: `## Plan` at start, `### <ID>.<N>` blocks under `## Notes` as tasks complete, and `## Summary` at resolve. **Use `obsidian op-set-section issue=<ID> name=Plan|Notes|Summary content="…" [append=true]` for these.** It's the only path that's section-scoped — frontmatter, `# Title`, `## Scope`, `## Tasks`, and any other H2s are preserved — and `append=true` is the safe alternative to the racy read-modify-rewrite pattern (the verb does the read/append/write atomically inside the plugin).

Older flows used `Edit` on the markdown file or `obsidian op-set-scope mode=body` (which clobbers everything outside `## Scope`). Both are footguns: parallel agents can race, and `mode=body` means a plan-mode agent persisting the Plan would also overwrite Tasks, Notes, and Summary. Don't reach for either when `op-set-section` fits.

**Fallback (plugin missing/disabled).** If `op-obsidian` is not enabled and you can't enable it, fall back to `obsidian read` (full file) → splice the new section in memory → `obsidian append` or `Write` the full file back. There is no raw-CLI shortcut that mirrors `op-set-section`'s scoping. The verb's payload constraints — `name` ∈ `Plan|Notes|Summary`, no `## ` H2 in `content` — apply to the in-memory splice too.

## `op-append-commit` failure modes

When a project's policy is to call `op-append-commit` after each commit (or batch at resolve), three failure shapes show up. The skill is workflow-agnostic about *when* you call it; this section covers what to do when the call itself fails.

- **`git rev-parse` / `git log` errors** (not a repo, detached state, empty history) → note the failure once, skip the append for that commit, and continue with the work. Do **not** retry in a loop, and do **not** synthesize a sha. If the project does a resolve-time back-fill, surface the skipped commits there.
- **Missing or unknown issue id** (the caller didn't pass one, or the id doesn't resolve to a file) → stop and ask the user for the `<PREFIX>-<N>`. Never append to a guessed issue — `commits:` is a permanent record on the resolved-issue note, and wrong attribution is worse than a missing entry.
- **`obsidian op-append-commit` returns an error** (vault unreachable, plugin disabled, issue file moved mid-session) → re-probe the plugin (`app.plugins.enabledPlugins.has("op-obsidian")`) and re-resolve the issue path. If it still fails, record the `<sha7> <subject>` pair in the session (or a scratch note) and batch-append later; don't block the project's commit cadence on vault health.
