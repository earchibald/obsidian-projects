import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";

// Installs a SessionEnd hook for each supported agent (Claude Code, Gemini CLI,
// Copilot CLI). The hook invokes a shared shell script that opens an
// obsidian:// URI so the plugin can clear the `agent:` frontmatter when the
// agent session terminates.
//
// The hook is gated on $OP_ISSUE_ID being set in the session env — we export
// that from terminalLaunch.ts, so only op-launched sessions fire the callback.
// Runs on every plugin load; each step is idempotent.

export interface HookInstallResult {
  scriptPath: string;
  installed: string[];
  skipped: string[];
}

const MARKER = "op-obsidian-session-end";
const SCRIPT_REL = path.join(".op-obsidian", "hooks", "session-end.sh");

export async function installAgentHooks(): Promise<HookInstallResult> {
  const home = os.homedir();
  const scriptPath = path.join(home, SCRIPT_REL);
  await writeScript(scriptPath);

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

  return { scriptPath, installed, skipped };
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
    '  open "$URI" >/dev/null 2>&1 || true',
    'elif command -v xdg-open >/dev/null 2>&1; then',
    '  xdg-open "$URI" >/dev/null 2>&1 || true',
    "fi",
    "exit 0",
    "",
  ].join("\n");
  await fs.writeFile(scriptPath, body, { mode: 0o755 });
  await fs.chmod(scriptPath, 0o755);
}

// Claude Code: ~/.claude/settings.json, hooks.SessionEnd[].hooks[] with
// { type: "command", command }. Tag via a sentinel string in the command so
// we don't duplicate on reinstall.
async function installClaudeHook(home: string, scriptPath: string): Promise<boolean> {
  const file = path.join(home, ".claude", "settings.json");
  const tag = `# ${MARKER}`;
  const command = `${tag}\n${shQuote(scriptPath)}`;
  return upsertEventHook(file, "SessionEnd", command, (existing) =>
    typeof existing?.command === "string" && existing.command.includes(MARKER),
  );
}

// Gemini CLI: ~/.gemini/settings.json, same schema as Claude.
async function installGeminiHook(home: string, scriptPath: string): Promise<boolean> {
  const file = path.join(home, ".gemini", "settings.json");
  const tag = `# ${MARKER}`;
  const command = `${tag}\n${shQuote(scriptPath)}`;
  return upsertEventHook(file, "SessionEnd", command, (existing) =>
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

// Upsert a { matcher:"*", hooks:[{type:"command",command}] } block into
// settings.hooks.<event>. Idempotent via the `matcher` predicate.
async function upsertEventHook(
  file: string,
  event: string,
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
    matcher: "*",
    hooks: [{ type: "command", command }],
  });
  hooks[event] = list;
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
