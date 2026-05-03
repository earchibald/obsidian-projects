import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import { execFileSync } from "child_process";
import * as os from "os";
import * as path from "path";
import { installAgentHooks } from "./agentHooks";

const GUARD_MARKER = "op-obsidian-pretool-worktree-guard";
const SESSION_MARKER = "op-obsidian-session-end";

// installAgentHooks writes to $HOME. Redirect HOME to a tmpdir per test so we
// exercise the real filesystem without touching the developer's dotfiles.
let tmpHome: string;
let origHome: string | undefined;

async function mkTmp(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function readJson(file: string): Promise<any> {
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw);
}

function findHooksFor(json: any, event: string, marker: string): any[] {
  const list: any[] = json?.hooks?.[event] ?? [];
  const matches: any[] = [];
  for (const block of list) {
    for (const h of block?.hooks ?? []) {
      if (typeof h?.command === "string" && h.command.includes(marker)) {
        matches.push({ block, hook: h });
      }
    }
  }
  return matches;
}

beforeEach(async () => {
  origHome = process.env.HOME;
  tmpHome = await mkTmp("op-hooks-test-");
  process.env.HOME = tmpHome;
});

afterEach(async () => {
  if (origHome === undefined) delete process.env.HOME;
  else process.env.HOME = origHome;
  await fs.rm(tmpHome, { recursive: true, force: true });
});

describe("installAgentHooks — PreToolUse worktree guard", () => {
  it("installs the guard for claude + gemini when enforceWorktree is true", async () => {
    const res = await installAgentHooks({ enforceWorktree: true });

    expect(res.guardScriptPath).toBe(
      path.join(tmpHome, ".op-obsidian", "hooks", "pretool-worktree-guard.sh"),
    );
    const stat = await fs.stat(res.guardScriptPath);
    expect(stat.isFile()).toBe(true);
    // Executable bit set (at least for owner)
    expect(stat.mode & 0o100).toBe(0o100);

    expect(res.guardInstalled.sort()).toEqual(["claude", "gemini"]);
    // Copilot CLI has no pre-tool gate — it must be reported as a gap.
    expect(res.guardSkipped).toContain("copilot");

    const claude = await readJson(path.join(tmpHome, ".claude", "settings.json"));
    const gemini = await readJson(path.join(tmpHome, ".gemini", "settings.json"));

    const claudeBlocks = findHooksFor(claude, "PreToolUse", GUARD_MARKER);
    const geminiBlocks = findHooksFor(gemini, "PreToolUse", GUARD_MARKER);
    expect(claudeBlocks).toHaveLength(1);
    expect(geminiBlocks).toHaveLength(1);
    expect(claudeBlocks[0].block.matcher).toBe("Edit|Write|MultiEdit|NotebookEdit");
    expect(geminiBlocks[0].block.matcher).toBe("Edit|Write|MultiEdit|NotebookEdit");
  });

  it("is idempotent — repeat installs do not duplicate guard blocks", async () => {
    await installAgentHooks({ enforceWorktree: true });
    const second = await installAgentHooks({ enforceWorktree: true });

    expect(second.guardInstalled).toEqual([]);

    const claude = await readJson(path.join(tmpHome, ".claude", "settings.json"));
    expect(findHooksFor(claude, "PreToolUse", GUARD_MARKER)).toHaveLength(1);
  });

  it("uninstalls the guard when enforceWorktree flips to false", async () => {
    await installAgentHooks({ enforceWorktree: true });
    const off = await installAgentHooks({ enforceWorktree: false });

    expect(off.guardUninstalled.sort()).toEqual(["claude", "gemini"]);

    const claude = await readJson(path.join(tmpHome, ".claude", "settings.json"));
    const gemini = await readJson(path.join(tmpHome, ".gemini", "settings.json"));
    expect(findHooksFor(claude, "PreToolUse", GUARD_MARKER)).toHaveLength(0);
    expect(findHooksFor(gemini, "PreToolUse", GUARD_MARKER)).toHaveLength(0);

    // SessionEnd hook must remain — uninstall is surgical.
    expect(findHooksFor(claude, "SessionEnd", SESSION_MARKER).length).toBeGreaterThan(0);
  });

  it("does not install the guard when enforceWorktree is false", async () => {
    const res = await installAgentHooks({ enforceWorktree: false });
    expect(res.guardInstalled).toEqual([]);
    const claude = await readJson(path.join(tmpHome, ".claude", "settings.json"));
    expect(findHooksFor(claude, "PreToolUse", GUARD_MARKER)).toHaveLength(0);
  });
});

// The guard script is a real bash script — exercise it against fixture git
// repos to confirm the branching logic.
describe("pretool-worktree-guard.sh — runtime behavior", () => {
  let scriptPath: string;
  let repo: string;

  async function runGuard(env: NodeJS.ProcessEnv, cwd: string): Promise<{ code: number; stderr: string }> {
    try {
      execFileSync("bash", [scriptPath], {
        cwd,
        env: { ...process.env, ...env },
        stdio: ["ignore", "pipe", "pipe"],
      });
      return { code: 0, stderr: "" };
    } catch (err: any) {
      return { code: err.status ?? -1, stderr: String(err.stderr ?? "") };
    }
  }

  beforeEach(async () => {
    const res = await installAgentHooks({ enforceWorktree: true });
    scriptPath = res.guardScriptPath;
    repo = await mkTmp("op-guard-repo-");
    execFileSync("git", ["init", "-q", "-b", "main", repo]);
    execFileSync("git", ["-C", repo, "config", "user.email", "t@t"]);
    execFileSync("git", ["-C", repo, "config", "user.name", "t"]);
    await fs.writeFile(path.join(repo, "f.txt"), "hi\n");
    execFileSync("git", ["-C", repo, "add", "."]);
    execFileSync("git", ["-C", repo, "commit", "-q", "-m", "init"]);
  });

  afterEach(async () => {
    await fs.rm(repo, { recursive: true, force: true });
  });

  it("no-op when OP_ISSUE_ID is unset", async () => {
    const r = await runGuard({ OP_ISSUE_ID: "" }, repo);
    expect(r.code).toBe(0);
  });

  it("no-op when OP_ALLOW_MAIN_EDIT=1", async () => {
    const r = await runGuard({ OP_ISSUE_ID: "OP-1", OP_ALLOW_MAIN_EDIT: "1" }, repo);
    expect(r.code).toBe(0);
  });

  it("blocks with exit 2 on the main branch of the main checkout", async () => {
    const r = await runGuard({ OP_ISSUE_ID: "OP-1" }, repo);
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/refusing edit on main checkout for OP-1/);
    expect(r.stderr).toMatch(/git worktree add/);
  });

  it("allows edits on a feature branch", async () => {
    execFileSync("git", ["-C", repo, "checkout", "-q", "-b", "feature/x"]);
    const r = await runGuard({ OP_ISSUE_ID: "OP-1" }, repo);
    expect(r.code).toBe(0);
  });

  it("allows edits inside a linked worktree (even on the default branch name)", async () => {
    const wt = await mkTmp("op-guard-wt-");
    await fs.rm(wt, { recursive: true, force: true });
    execFileSync("git", ["-C", repo, "worktree", "add", "-q", "-b", "wt-branch", wt]);
    const r = await runGuard({ OP_ISSUE_ID: "OP-1" }, wt);
    expect(r.code).toBe(0);
    await fs.rm(wt, { recursive: true, force: true });
  });

  it("no-op when not inside a git repo", async () => {
    const outside = await mkTmp("op-guard-nogit-");
    const r = await runGuard({ OP_ISSUE_ID: "OP-1" }, outside);
    expect(r.code).toBe(0);
    await fs.rm(outside, { recursive: true, force: true });
  });

  it("no-op on detached HEAD", async () => {
    const sha = execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    execFileSync("git", ["-C", repo, "checkout", "-q", sha]);
    const r = await runGuard({ OP_ISSUE_ID: "OP-1" }, repo);
    expect(r.code).toBe(0);
  });
});

// OP-259: managed-note refusal layer. Exercises the layer in isolation by
// installing it in a worktree (so the worktree layer is a no-op) and feeding
// the script a Claude-Code-style PreToolUse JSON payload on stdin.
describe("pretool-worktree-guard.sh — managed-note layer", () => {
  let scriptPath: string;
  let repo: string;
  let wt: string;

  async function runGuard(
    env: NodeJS.ProcessEnv,
    cwd: string,
    stdin: string,
  ): Promise<{ code: number; stderr: string }> {
    try {
      execFileSync("bash", [scriptPath], {
        cwd,
        env: { ...process.env, ...env },
        input: stdin,
        stdio: ["pipe", "pipe", "pipe"],
      });
      return { code: 0, stderr: "" };
    } catch (err: any) {
      return { code: err.status ?? -1, stderr: String(err.stderr ?? "") };
    }
  }

  function payload(filePath: string): string {
    return JSON.stringify({
      session_id: "s",
      tool_name: "Edit",
      tool_input: { file_path: filePath, old_string: "a", new_string: "b" },
    });
  }

  beforeEach(async () => {
    const res = await installAgentHooks({
      enforceWorktree: true,
      managedNoteGuard: true,
    });
    scriptPath = res.guardScriptPath;
    repo = await mkTmp("op-managed-repo-");
    execFileSync("git", ["init", "-q", "-b", "main", repo]);
    execFileSync("git", ["-C", repo, "config", "user.email", "t@t"]);
    execFileSync("git", ["-C", repo, "config", "user.name", "t"]);
    await fs.writeFile(path.join(repo, "f.txt"), "hi\n");
    execFileSync("git", ["-C", repo, "add", "."]);
    execFileSync("git", ["-C", repo, "commit", "-q", "-m", "init"]);
    // Linked worktree → worktree layer is a no-op; managed-note layer alone is
    // exercised.
    wt = await mkTmp("op-managed-wt-");
    await fs.rm(wt, { recursive: true, force: true });
    execFileSync("git", ["-C", repo, "worktree", "add", "-q", "-b", "wt-x", wt]);
  });

  afterEach(async () => {
    await fs.rm(repo, { recursive: true, force: true });
    await fs.rm(wt, { recursive: true, force: true });
  });

  it("refuses Edit on a managed note", async () => {
    const note = path.join(wt, "ISSUES", "OP-9 some issue.md");
    await fs.mkdir(path.dirname(note), { recursive: true });
    await fs.writeFile(
      note,
      "---\nid: OP-9\nop_managed: true\n---\n\n# OP-9\n",
    );
    const r = await runGuard({ OP_ISSUE_ID: "OP-9" }, wt, payload(note));
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/refusing edit on managed note/);
    // Path-based hint resolves to the issue endpoints.
    expect(r.stderr).toMatch(/op-set-tasks/);
    expect(r.stderr).toMatch(/OP_ALLOW_MANAGED_EDIT=1/);
  });

  it("OP_ALLOW_MANAGED_EDIT=1 permits the edit", async () => {
    const note = path.join(wt, "ISSUES", "OP-9 some issue.md");
    await fs.mkdir(path.dirname(note), { recursive: true });
    await fs.writeFile(
      note,
      "---\nid: OP-9\nop_managed: true\n---\n",
    );
    const r = await runGuard(
      { OP_ISSUE_ID: "OP-9", OP_ALLOW_MANAGED_EDIT: "1" },
      wt,
      payload(note),
    );
    expect(r.code).toBe(0);
  });

  it("allows edits on an unmanaged note", async () => {
    const note = path.join(wt, "ISSUES", "OP-9 some issue.md");
    await fs.mkdir(path.dirname(note), { recursive: true });
    await fs.writeFile(note, "---\nid: OP-9\n---\n\n# OP-9\n");
    const r = await runGuard({ OP_ISSUE_ID: "OP-9" }, wt, payload(note));
    expect(r.code).toBe(0);
  });

  it("emits a TASK-specific hint for TASK note paths", async () => {
    const note = path.join(wt, "TASKS", "OP-9.1 task.md");
    await fs.mkdir(path.dirname(note), { recursive: true });
    await fs.writeFile(note, "---\nop_managed: true\n---\n");
    const r = await runGuard({ OP_ISSUE_ID: "OP-9" }, wt, payload(note));
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/op-task-set-status|op-task-append-note/);
  });
});

// OP-259: when managedNoteGuard is off but enforceWorktree is on, the script
// must contain the worktree layer and *not* the managed layer — so a managed
// note in a linked worktree is allowed (the layer is absent entirely).
describe("installAgentHooks — managed layer is opt-in", () => {
  it("omits the managed-note layer when managedNoteGuard is false", async () => {
    const res = await installAgentHooks({
      enforceWorktree: true,
      managedNoteGuard: false,
    });
    const body = await fs.readFile(res.guardScriptPath, "utf8");
    expect(body).toMatch(/Layer 1: worktree refusal/);
    expect(body).not.toMatch(/Layer 2: managed-note refusal/);
    // The header comment mentions `OP_ALLOW_MANAGED_EDIT` and `op_managed` for
    // documentation purposes regardless of layer presence — assert against the
    // actual layer-2 logic strings instead.
    expect(body).not.toMatch(/refusing edit on managed note/);
    expect(body).not.toMatch(/Path-based hint/);
  });

  it("installs the guard hook when only managedNoteGuard is true", async () => {
    const res = await installAgentHooks({
      enforceWorktree: false,
      managedNoteGuard: true,
    });
    expect(res.guardInstalled.sort()).toEqual(["claude", "gemini"]);
    const body = await fs.readFile(res.guardScriptPath, "utf8");
    expect(body).not.toMatch(/Layer 1: worktree refusal/);
    expect(body).toMatch(/Layer 2: managed-note refusal/);
  });

  it("uninstalls the guard when both layers are off", async () => {
    await installAgentHooks({ enforceWorktree: true, managedNoteGuard: true });
    const off = await installAgentHooks({
      enforceWorktree: false,
      managedNoteGuard: false,
    });
    expect(off.guardUninstalled.sort()).toEqual(["claude", "gemini"]);
  });
});
