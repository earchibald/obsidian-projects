import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";

// Installs a SessionEnd hook for each supported agent (Claude Code, Gemini CLI,
// Copilot CLI). The hook invokes a shared shell script that opens an
// obsidian:// URI so the plugin can clear the `agent:` frontmatter when the
// agent session terminates.
//
// Also — when `enforceWorktree` is enabled — installs a PreToolUse hook for
// Claude Code and Gemini CLI that blocks Edit/Write/MultiEdit/NotebookEdit on
// the main checkout for op-launched sessions. Copilot CLI has no pre-tool gate
// (surfaced in the HookInstallResult.skipped list). Turning the flag off
// uninstalls the guard via the sentinel.
//
// The SessionEnd hook is gated on $OP_ISSUE_ID being set in the session env —
// we export that from terminalLaunch.ts, so only op-launched sessions fire the
// callback. Runs on every plugin load; each step is idempotent.

export interface HookInstallOptions {
  enforceWorktree?: boolean;
  /** OP-259: when true, the PreToolUse guard script includes the managed-note
   *  refusal layer. Independent of `enforceWorktree`: either flag (or both)
   *  triggers the hook install — the script body only contains the layers
   *  that are enabled. Default **on** as of OP-263 (Phase 6 of OP-218). */
  managedNoteGuard?: boolean;
  /** OP-260: when true, the PreToolUse guard script refuses agent creation of
   *  new files under `Projects/<slug>/{ISSUES,RESOLVED ISSUES,TASKS}/`. Same
   *  install/uninstall plumbing as the managed-note layer. Default **on**
   *  as of OP-263 (Phase 6 of OP-218). */
  newFileGuard?: boolean;
}

export interface HookInstallResult {
  scriptPath: string;
  installed: string[];
  skipped: string[];
  guardScriptPath: string;
  guardInstalled: string[];
  guardUninstalled: string[];
  guardSkipped: string[];
}

const MARKER = "op-obsidian-session-end";
const GUARD_MARKER = "op-obsidian-pretool-worktree-guard";
const SCRIPT_REL = path.join(".op-obsidian", "hooks", "session-end.sh");
const GUARD_SCRIPT_REL = path.join(".op-obsidian", "hooks", "pretool-worktree-guard.sh");
const PRE_TOOL_MATCHER = "Edit|Write|MultiEdit|NotebookEdit";

export async function installAgentHooks(
  options: HookInstallOptions = {},
): Promise<HookInstallResult> {
  const home = os.homedir();
  const scriptPath = path.join(home, SCRIPT_REL);
  const guardScriptPath = path.join(home, GUARD_SCRIPT_REL);
  await writeScript(scriptPath);
  const enforceWorktree = !!options.enforceWorktree;
  const managedNoteGuard = !!options.managedNoteGuard;
  const newFileGuard = !!options.newFileGuard;
  await writeGuardScript(guardScriptPath, {
    enforceWorktree,
    managedNoteGuard,
    newFileGuard,
  });

  const installed: string[] = [];
  const skipped: string[] = [];

  const register = async (label: string, fn: () => Promise<boolean>) => {
    try {
      const changed = await fn();
      if (changed) installed.push(label);
    } catch (err) {
      console.warn(`[op-obsidian] hook install skipped for ${label}:`, err);
      skipped.push(label);
    }
  };

  await register("claude", () => installClaudeHook(home, scriptPath));
  await register("gemini", () => installGeminiHook(home, scriptPath));
  await register("copilot", () => installCopilotHook(home, scriptPath));

  const guardInstalled: string[] = [];
  const guardUninstalled: string[] = [];
  const guardSkipped: string[] = [];
  // The guard hook is installed when *any* layer is enabled. Within the
  // installed script, only the enabled layers actually run (writeGuardScript
  // emits them conditionally), so an enabled flag matrix of {worktree:true,
  // managed:false, newFile:false} still installs the hook but the optional
  // layers are absent.
  const wantInstall = enforceWorktree || managedNoteGuard || newFileGuard;

  const guardStep = async (label: string, fn: () => Promise<"installed" | "removed" | "noop">) => {
    try {
      const r = await fn();
      if (r === "installed") guardInstalled.push(label);
      else if (r === "removed") guardUninstalled.push(label);
    } catch (err) {
      console.warn(`[op-obsidian] pretool guard ${wantInstall ? "install" : "uninstall"} skipped for ${label}:`, err);
      guardSkipped.push(label);
    }
  };

  if (wantInstall) {
    await guardStep("claude", () => installClaudePretoolGuard(home, guardScriptPath));
    await guardStep("gemini", () => installGeminiPretoolGuard(home, guardScriptPath));
    // Copilot CLI has no pre-tool gate; record the gap for the caller.
    guardSkipped.push("copilot");
  } else {
    await guardStep("claude", () => uninstallClaudePretoolGuard(home));
    await guardStep("gemini", () => uninstallGeminiPretoolGuard(home));
  }

  return {
    scriptPath,
    installed,
    skipped,
    guardScriptPath,
    guardInstalled,
    guardUninstalled,
    guardSkipped,
  };
}

async function writeScript(scriptPath: string): Promise<void> {
  await fs.mkdir(path.dirname(scriptPath), { recursive: true });
  const body = [
    "#!/bin/bash",
    `# ${MARKER}`,
    "# Notify op-obsidian that an agent session has ended. The launcher in",
    "# terminalLaunch.ts exports OP_ISSUE_ID / OP_AGENT_ID into the agent's env;",
    "# if they are missing this session wasn't started by op — exit silently.",
    'if [ -z "${OP_ISSUE_ID:-}" ]; then',
    "  exit 0",
    "fi",
    'URI="obsidian://op-agent-ended?id=${OP_ISSUE_ID}"',
    'if [ -n "${OP_AGENT_ID:-}" ]; then',
    '  URI="${URI}&agent=${OP_AGENT_ID}"',
    "fi",
    'if command -v open >/dev/null 2>&1; then',
    '  # -g: open in background so Obsidian does not steal focus (OP-229).',
    '  open -g "$URI" >/dev/null 2>&1 || true',
    'elif command -v xdg-open >/dev/null 2>&1; then',
    '  xdg-open "$URI" >/dev/null 2>&1 || true',
    "fi",
    "exit 0",
    "",
  ].join("\n");
  await fs.writeFile(scriptPath, body, { mode: 0o755 });
  await fs.chmod(scriptPath, 0o755);
}

interface GuardScriptLayers {
  enforceWorktree: boolean;
  managedNoteGuard: boolean;
  newFileGuard: boolean;
}

async function writeGuardScript(
  scriptPath: string,
  layers: GuardScriptLayers,
): Promise<void> {
  await fs.mkdir(path.dirname(scriptPath), { recursive: true });
  const body: string[] = [];
  body.push(
    "#!/bin/bash",
    `# ${GUARD_MARKER}`,
    "# PreToolUse guard for op-launched agents. Up to three layers, gated by",
    "# the plugin's settings (the install path emits only the layers that are",
    "# enabled — flip a setting → re-run installAgentHooks → script body is",
    "# rewritten):",
    "#",
    "#   1. Worktree refusal — blocks Edit/Write on the main checkout of a git",
    "#      repo whose HEAD is the default branch. Override per-call via",
    "#      OP_ALLOW_MAIN_EDIT=1.",
    "#",
    "#   2. Managed-note refusal (OP-259) — refuses Edit/Write of any vault",
    "#      `*.md` whose frontmatter contains `op_managed: true`. Override",
    "#      per-call via OP_ALLOW_MANAGED_EDIT=1.",
    "#",
    "#   3. New-file refusal (OP-260) — refuses Write of new files under",
    "#      `Projects/<slug>/{ISSUES,RESOLVED ISSUES,TASKS}/`. Override",
    "#      per-call via OP_ALLOW_NEW_FILE=1.",
    "#",
    "# Each layer exits 2 with stderr on refusal; otherwise control falls",
    "# through to the next layer (or `exit 0`). The whole script is a no-op",
    "# when the session isn't op-launched ($OP_ISSUE_ID unset).",
    "",
    'if [ -z "${OP_ISSUE_ID:-}" ]; then',
    "  exit 0",
    "fi",
    "",
  );

  if (layers.enforceWorktree) {
    body.push(
    "# === Layer 1: worktree refusal ===",
    'if [ "${OP_ALLOW_MAIN_EDIT:-}" != "1" ] \\',
    "    && command -v git >/dev/null 2>&1 \\",
    "    && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then",
    "  gitdir=$(git rev-parse --git-dir 2>/dev/null)",
    '  case "$gitdir" in',
    '    *".git/worktrees/"*) ;;  # linked worktree — fall through',
    "    *)",
    '      branch=$(git symbolic-ref --short HEAD 2>/dev/null || echo "")',
    '      if [ -n "$branch" ]; then',
    "        default=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||')",
    "        default=${default:-main}",
    '        if [ "$branch" = "$default" ] || [ "$branch" = "main" ] || [ "$branch" = "master" ]; then',
    '          echo "op-obsidian: refusing edit on main checkout for $OP_ISSUE_ID." >&2',
    '          echo "Run: git worktree add ../$(basename \\"$PWD\\")-$OP_ISSUE_ID -b worktree-$OP_ISSUE_ID" >&2',
    '          echo "Or export OP_ALLOW_MAIN_EDIT=1 for a one-line edit." >&2',
    "          exit 2",
    "        fi",
    "      fi",
    "      ;;",
    "  esac",
    "fi",
    "",
    );
  }

  // Layers 2 and 3 both consume the PreToolUse JSON payload from stdin to
  // discover `tool_input.file_path`. Stdin is one-shot, so when both layers
  // are enabled we parse it once up front and let each layer use control flow
  // (no early `exit 0`s) to fall through to the next layer.
  if (layers.managedNoteGuard || layers.newFileGuard) {
    body.push(
      "# === Shared stdin parse (Layers 2 & 3) ===",
      "# PreToolUse hook receives the tool invocation as JSON on stdin",
      '# (`{"tool_input": {"file_path": "/abs/path", ...}, ...}`). Extract the',
      "# first file_path with a tolerant sed — we restrict to a JSON-string",
      "# form, matching the trivial single-line shape Claude Code emits. If",
      "# stdin is empty or unparseable, both layers no-op.",
      'input=$(cat 2>/dev/null || true)',
      'file=""',
      'if [ -n "$input" ]; then',
      '  file=$(printf %s "$input" | sed -n \'s/.*"file_path"[[:space:]]*:[[:space:]]*"\\([^"]*\\)".*/\\1/p\' | head -n1)',
      "fi",
      "",
    );
  }

  if (layers.managedNoteGuard) {
    body.push(
    "# === Layer 2: managed-note refusal ===",
    'if [ "${OP_ALLOW_MANAGED_EDIT:-}" != "1" ] && [ -n "$file" ]; then',
    '  case "$file" in',
    "    *.md)",
    '      if [ -f "$file" ]; then',
    "        # Frontmatter parse stays in pure shell (awk). We only recognize",
    "        # the trivial single-line `op_managed: true` form the migration",
    "        # writes — nested/quoted/multi-line variants fall through.",
    "        managed=$(awk '",
    '          BEGIN { infm = 0 }',
    '          NR == 1 && $0 == "---" { infm = 1; next }',
    '          infm == 1 && $0 == "---" { exit }',
    '          infm == 1 && /^op_managed:[[:space:]]*true[[:space:]]*$/ { print "yes"; exit }',
    '        \' "$file")',
    '        if [ "$managed" = "yes" ]; then',
    "          # Path-based hint at the right op-* endpoint.",
    '          case "$file" in',
    '            */TASKS/*.md)             hint="Use op-task-set-status (status flips) or op-task-append-note (progress notes); op-task-create for new TASK notes." ;;',
    '            */ISSUES/*.md|*/RESOLVED\\ ISSUES/*.md)',
    '                                      hint="Use op-set-tasks (## Tasks checklist), op-set-section (Plan/Notes/Summary), op-set-scope (Scope), op-append-commit, op-set-pr, op-resolve. Frontmatter status/agent flips have dedicated verbs." ;;',
    '            */STATUS.md)              hint="STATUS.md is plugin-managed; use op-scaffold or the dedicated STATUS endpoint instead of editing in place." ;;',
    '            */DOCS/*.md)              hint="Use op-doc-create (new vault DOC) or op-doc-edit (existing). Repo-tracked DOCS under DOCS/superpowers/ follow the repo workflow." ;;',
    '            *)                        hint="Use the appropriate op-* endpoint instead of editing the managed note directly." ;;',
    "          esac",
    '          echo "op-obsidian: refusing edit on managed note: $file" >&2',
    '          echo "$hint" >&2',
    '          echo "Override with OP_ALLOW_MANAGED_EDIT=1 for a one-line edit." >&2',
    "          exit 2",
    "        fi",
    "      fi",
    "      ;;",
    "  esac",
    "fi",
    "",
    );
  }

  if (layers.newFileGuard) {
    body.push(
    "# === Layer 3: new-file refusal ===",
    'if [ "${OP_ALLOW_NEW_FILE:-}" != "1" ] && [ -n "$file" ]; then',
    '  case "$file" in',
    '    */Projects/*/ISSUES/*|*/Projects/*/RESOLVED\\ ISSUES/*|*/Projects/*/TASKS/*)',
    '      if [ ! -e "$file" ]; then',
    '        case "$file" in',
    '          */Projects/*/ISSUES/*)             new_hint="Use op-new project=<slug> title=\\"...\\" to create new issues — the plugin owns ID numbering, filename sanitization, and the schema-conformant frontmatter." ;;',
    '          */Projects/*/TASKS/*)              new_hint="Use op-task-create issue=<id> title=\\"...\\" to create new TASK notes — the plugin links them to the parent issue and sets the schema." ;;',
    '          */Projects/*/RESOLVED\\ ISSUES/*)  new_hint="" ;;',
    '          *)                                 new_hint="" ;;',
    "        esac",
    '        echo "op-obsidian: refusing creation of new file under managed folder: $file" >&2',
    '        if [ -n "$new_hint" ]; then echo "$new_hint" >&2; fi',
    '        echo "Override with OP_ALLOW_NEW_FILE=1 for a one-line edit." >&2',
    "        exit 2",
    "      fi",
    "      ;;",
    "  esac",
    "fi",
    "",
    );
  }

  body.push("exit 0", "");
  await fs.writeFile(scriptPath, body.join("\n"), { mode: 0o755 });
  await fs.chmod(scriptPath, 0o755);
}

// Claude Code: ~/.claude/settings.json, hooks.SessionEnd[].hooks[] with
// { type: "command", command }. Tag via a sentinel string in the command so
// we don't duplicate on reinstall.
async function installClaudeHook(home: string, scriptPath: string): Promise<boolean> {
  const file = path.join(home, ".claude", "settings.json");
  const tag = `# ${MARKER}`;
  const command = `${tag}\n${shQuote(scriptPath)}`;
  return upsertEventHook(file, "SessionEnd", "*", command, (existing) =>
    typeof existing?.command === "string" && existing.command.includes(MARKER),
  );
}

// Gemini CLI: ~/.gemini/settings.json, same schema as Claude.
async function installGeminiHook(home: string, scriptPath: string): Promise<boolean> {
  const file = path.join(home, ".gemini", "settings.json");
  const tag = `# ${MARKER}`;
  const command = `${tag}\n${shQuote(scriptPath)}`;
  return upsertEventHook(file, "SessionEnd", "*", command, (existing) =>
    typeof existing?.command === "string" && existing.command.includes(MARKER),
  );
}

// Copilot CLI: different schema — `hooks.sessionEnd[]` is a flat list of
// { type: "command", bash, cwd, timeoutSec }. Docs say hooks load from cwd;
// we place the file in ~/.copilot/hooks.json as best-effort user-level config.
async function installCopilotHook(home: string, scriptPath: string): Promise<boolean> {
  const file = path.join(home, ".copilot", "hooks.json");
  const tag = `# ${MARKER}`;
  const entry = {
    type: "command",
    bash: `${tag}\n${shQuote(scriptPath)}`,
    cwd: ".",
    timeoutSec: 10,
  };
  const json = await readJson(file);
  const hooks = (json.hooks ??= {});
  const list: any[] = Array.isArray(hooks.sessionEnd) ? hooks.sessionEnd : [];
  if (list.some((h) => typeof h?.bash === "string" && h.bash.includes(MARKER))) {
    return false;
  }
  list.push(entry);
  hooks.sessionEnd = list;
  await writeJson(file, json);
  return true;
}

async function installClaudePretoolGuard(
  home: string,
  guardScriptPath: string,
): Promise<"installed" | "removed" | "noop"> {
  const file = path.join(home, ".claude", "settings.json");
  const tag = `# ${GUARD_MARKER}`;
  const command = `${tag}\n${shQuote(guardScriptPath)}`;
  const added = await upsertEventHook(file, "PreToolUse", PRE_TOOL_MATCHER, command, (existing) =>
    typeof existing?.command === "string" && existing.command.includes(GUARD_MARKER),
  );
  return added ? "installed" : "noop";
}

async function installGeminiPretoolGuard(
  home: string,
  guardScriptPath: string,
): Promise<"installed" | "removed" | "noop"> {
  const file = path.join(home, ".gemini", "settings.json");
  const tag = `# ${GUARD_MARKER}`;
  const command = `${tag}\n${shQuote(guardScriptPath)}`;
  const added = await upsertEventHook(file, "PreToolUse", PRE_TOOL_MATCHER, command, (existing) =>
    typeof existing?.command === "string" && existing.command.includes(GUARD_MARKER),
  );
  return added ? "installed" : "noop";
}

async function uninstallClaudePretoolGuard(home: string): Promise<"installed" | "removed" | "noop"> {
  const file = path.join(home, ".claude", "settings.json");
  const removed = await removeEventHook(file, "PreToolUse", (entry) =>
    typeof entry?.command === "string" && entry.command.includes(GUARD_MARKER),
  );
  return removed ? "removed" : "noop";
}

async function uninstallGeminiPretoolGuard(home: string): Promise<"installed" | "removed" | "noop"> {
  const file = path.join(home, ".gemini", "settings.json");
  const removed = await removeEventHook(file, "PreToolUse", (entry) =>
    typeof entry?.command === "string" && entry.command.includes(GUARD_MARKER),
  );
  return removed ? "removed" : "noop";
}

// Upsert a { matcher, hooks:[{type:"command",command}] } block into
// settings.hooks.<event>. Idempotent via the `existsPredicate`.
async function upsertEventHook(
  file: string,
  event: string,
  matcher: string,
  command: string,
  existsPredicate: (entry: any) => boolean,
): Promise<boolean> {
  const json = await readJson(file);
  const hooks = (json.hooks ??= {});
  const list: any[] = Array.isArray(hooks[event]) ? hooks[event] : [];

  for (const block of list) {
    const inner: any[] = Array.isArray(block?.hooks) ? block.hooks : [];
    if (inner.some(existsPredicate)) return false;
  }

  list.push({
    matcher,
    hooks: [{ type: "command", command }],
  });
  hooks[event] = list;
  await writeJson(file, json);
  return true;
}

// Remove any block under hooks.<event> whose inner entries match `predicate`.
// Prunes empty blocks and empty event arrays. Returns true when the file changed.
async function removeEventHook(
  file: string,
  event: string,
  predicate: (entry: any) => boolean,
): Promise<boolean> {
  let json: any;
  try {
    json = await readJson(file);
  } catch {
    return false;
  }
  const hooks = json?.hooks;
  if (!hooks || !Array.isArray(hooks[event])) return false;
  const list: any[] = hooks[event];
  let changed = false;
  const filtered: any[] = [];
  for (const block of list) {
    const inner: any[] = Array.isArray(block?.hooks) ? block.hooks : [];
    const kept = inner.filter((e) => !predicate(e));
    if (kept.length !== inner.length) changed = true;
    if (kept.length > 0) {
      filtered.push({ ...block, hooks: kept });
    } else {
      // entire block dropped
      changed = true;
    }
  }
  if (!changed) return false;
  if (filtered.length === 0) {
    delete hooks[event];
  } else {
    hooks[event] = filtered;
  }
  await writeJson(file, json);
  return true;
}

async function readJson(file: string): Promise<any> {
  try {
    const raw = await fs.readFile(file, "utf8");
    return raw.trim() ? JSON.parse(raw) : {};
  } catch (err: any) {
    if (err?.code === "ENOENT") return {};
    throw err;
  }
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2) + "\n", { mode: 0o644 });
}

function shQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}
