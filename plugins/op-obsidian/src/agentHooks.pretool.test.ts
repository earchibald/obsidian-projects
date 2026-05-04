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

// OP-260: new-file refusal layer. Mirrors the managed-note describe block —
// installs in a linked worktree so Layer 1 is a no-op, then drives the script
// with a Claude-Code-style PreToolUse JSON payload on stdin.
describe("pretool-worktree-guard.sh — new-file layer", () => {
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

  function payload(filePath: string, toolName = "Write"): string {
    return JSON.stringify({
      session_id: "s",
      tool_name: toolName,
      tool_input:
        toolName === "Write"
          ? { file_path: filePath, content: "x" }
          : { file_path: filePath, old_string: "a", new_string: "b" },
    });
  }

  beforeEach(async () => {
    const res = await installAgentHooks({
      enforceWorktree: true,
      managedNoteGuard: true,
      newFileGuard: true,
    });
    scriptPath = res.guardScriptPath;
    repo = await mkTmp("op-newfile-repo-");
    execFileSync("git", ["init", "-q", "-b", "main", repo]);
    execFileSync("git", ["-C", repo, "config", "user.email", "t@t"]);
    execFileSync("git", ["-C", repo, "config", "user.name", "t"]);
    await fs.writeFile(path.join(repo, "f.txt"), "hi\n");
    execFileSync("git", ["-C", repo, "add", "."]);
    execFileSync("git", ["-C", repo, "commit", "-q", "-m", "init"]);
    wt = await mkTmp("op-newfile-wt-");
    await fs.rm(wt, { recursive: true, force: true });
    execFileSync("git", ["-C", repo, "worktree", "add", "-q", "-b", "wt-y", wt]);
  });

  afterEach(async () => {
    await fs.rm(repo, { recursive: true, force: true });
    await fs.rm(wt, { recursive: true, force: true });
  });

  it("(a) refuses Write of a new file under ISSUES/", async () => {
    const note = path.join(wt, "Projects", "demo", "ISSUES", "DEMO-3 new.md");
    await fs.mkdir(path.dirname(note), { recursive: true });
    const r = await runGuard({ OP_ISSUE_ID: "DEMO-3" }, wt, payload(note));
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/refusing creation of new file under managed folder/);
    expect(r.stderr).toMatch(/op-new project=/);
    expect(r.stderr).toMatch(/OP_ALLOW_NEW_FILE=1/);
  });

  it("(b) refuses Write of a new file under TASKS/", async () => {
    const note = path.join(wt, "Projects", "demo", "TASKS", "DEMO-3.2 new.md");
    await fs.mkdir(path.dirname(note), { recursive: true });
    const r = await runGuard({ OP_ISSUE_ID: "DEMO-3" }, wt, payload(note));
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/refusing creation of new file under managed folder/);
    expect(r.stderr).toMatch(/op-task-create issue=/);
  });

  it("refuses Write of a new file under RESOLVED ISSUES/ but emits no command hint", async () => {
    const note = path.join(
      wt,
      "Projects",
      "demo",
      "RESOLVED ISSUES",
      "DEMO-1 done.md",
    );
    await fs.mkdir(path.dirname(note), { recursive: true });
    const r = await runGuard({ OP_ISSUE_ID: "DEMO-1" }, wt, payload(note));
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/refusing creation of new file under managed folder/);
    // No `op-*` command hint — the user may only get the override line.
    expect(r.stderr).not.toMatch(/op-new project=/);
    expect(r.stderr).not.toMatch(/op-task-create/);
    expect(r.stderr).toMatch(/OP_ALLOW_NEW_FILE=1/);
  });

  it("(c) OP_ALLOW_NEW_FILE=1 permits the create", async () => {
    const note = path.join(wt, "Projects", "demo", "ISSUES", "DEMO-3 new.md");
    await fs.mkdir(path.dirname(note), { recursive: true });
    const r = await runGuard(
      { OP_ISSUE_ID: "DEMO-3", OP_ALLOW_NEW_FILE: "1" },
      wt,
      payload(note),
    );
    expect(r.code).toBe(0);
  });

  it("(d) existing managed file edit still routes through Layer 2 (refused as managed-note)", async () => {
    const note = path.join(wt, "Projects", "demo", "ISSUES", "DEMO-3 ex.md");
    await fs.mkdir(path.dirname(note), { recursive: true });
    await fs.writeFile(
      note,
      "---\nid: DEMO-3\nop_managed: true\n---\n\n# DEMO-3\n",
    );
    const r = await runGuard({ OP_ISSUE_ID: "DEMO-3" }, wt, payload(note, "Edit"));
    expect(r.code).toBe(2);
    // Layer 2 fires first (managed-note refusal), not Layer 3 (file exists).
    expect(r.stderr).toMatch(/refusing edit on managed note/);
    expect(r.stderr).not.toMatch(/refusing creation of new file/);
  });

  it("existing unmanaged file under ISSUES/ is allowed (Layer 2 falls through, Layer 3 sees existing file)", async () => {
    const note = path.join(wt, "Projects", "demo", "ISSUES", "DEMO-3 unmgd.md");
    await fs.mkdir(path.dirname(note), { recursive: true });
    await fs.writeFile(note, "no frontmatter\n");
    const r = await runGuard({ OP_ISSUE_ID: "DEMO-3" }, wt, payload(note, "Edit"));
    expect(r.code).toBe(0);
  });

  it("(e) other paths under Projects/ are still allowed (e.g. STATUS.md, DOCS/)", async () => {
    const status = path.join(wt, "Projects", "demo", "STATUS.md");
    await fs.mkdir(path.dirname(status), { recursive: true });
    const r1 = await runGuard({ OP_ISSUE_ID: "DEMO-3" }, wt, payload(status));
    expect(r1.code).toBe(0);

    const doc = path.join(wt, "Projects", "demo", "DOCS", "notes.md");
    await fs.mkdir(path.dirname(doc), { recursive: true });
    const r2 = await runGuard({ OP_ISSUE_ID: "DEMO-3" }, wt, payload(doc));
    expect(r2.code).toBe(0);
  });

  it("OP_ALLOW_MANAGED_EDIT=1 does NOT bypass Layer 3 on new files", async () => {
    // The two override env vars are independent — a session that wants to
    // hand-edit a managed note (Layer 2 bypass) must still go through op-new
    // for new issue creation. Proves Layer 3 fires when Layer 2 is disabled
    // by env at the call site.
    const note = path.join(wt, "Projects", "demo", "ISSUES", "DEMO-5 new.md");
    await fs.mkdir(path.dirname(note), { recursive: true });
    const r = await runGuard(
      { OP_ISSUE_ID: "DEMO-5", OP_ALLOW_MANAGED_EDIT: "1" },
      wt,
      payload(note),
    );
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/refusing creation of new file/);
  });

  it("paths outside Projects/ are unaffected", async () => {
    const out = path.join(wt, "src", "newfile.ts");
    await fs.mkdir(path.dirname(out), { recursive: true });
    const r = await runGuard({ OP_ISSUE_ID: "DEMO-3" }, wt, payload(out));
    expect(r.code).toBe(0);
  });
});

// OP-260: opt-in/opt-out script-body and install assertions, mirroring the
// OP-259 "managed layer is opt-in" describe block.
describe("installAgentHooks — new-file layer is opt-in", () => {
  it("omits the new-file layer when newFileGuard is false", async () => {
    const res = await installAgentHooks({
      enforceWorktree: true,
      managedNoteGuard: true,
      newFileGuard: false,
    });
    const body = await fs.readFile(res.guardScriptPath, "utf8");
    expect(body).toMatch(/Layer 1: worktree refusal/);
    expect(body).toMatch(/Layer 2: managed-note refusal/);
    expect(body).not.toMatch(/Layer 3: new-file refusal/);
    expect(body).not.toMatch(/refusing creation of new file under managed folder/);
  });

  it("installs the guard hook when only newFileGuard is true", async () => {
    const res = await installAgentHooks({
      enforceWorktree: false,
      managedNoteGuard: false,
      newFileGuard: true,
    });
    expect(res.guardInstalled.sort()).toEqual(["claude", "gemini"]);
    const body = await fs.readFile(res.guardScriptPath, "utf8");
    expect(body).not.toMatch(/Layer 1: worktree refusal/);
    expect(body).not.toMatch(/Layer 2: managed-note refusal/);
    expect(body).toMatch(/Layer 3: new-file refusal/);
  });

  it("uninstalls the guard when all three layers are off", async () => {
    await installAgentHooks({
      enforceWorktree: true,
      managedNoteGuard: true,
      newFileGuard: true,
    });
    const off = await installAgentHooks({
      enforceWorktree: false,
      managedNoteGuard: false,
      newFileGuard: false,
    });
    expect(off.guardUninstalled.sort()).toEqual(["claude", "gemini"]);
  });
});

// OP-269: statusLine install / remove tests.
describe("installAgentHooks — statusLine (usePluginStatusline)", () => {
  const claudeSettings = () => path.join(tmpHome, ".claude", "settings.json");
  const runPath = () => path.join(tmpHome, ".claude", "statusline-plugin", "run");

  it("installs the statusLine when usePluginStatusline is true (default)", async () => {
    const res = await installAgentHooks({ usePluginStatusline: true });
    expect(res.statusLineInstalled).toBe(true);
    expect(res.statusLineRemoved).toBe(false);
    const json = await readJson(claudeSettings());
    expect(json.statusLine?.command).toBe(runPath());
    expect(json.statusLine?.type).toBe("command");
  });

  it("installs the statusLine by default (options omitted)", async () => {
    const res = await installAgentHooks({});
    expect(res.statusLineInstalled).toBe(true);
    const json = await readJson(claudeSettings());
    expect(json.statusLine?.command).toBe(runPath());
  });

  it("is idempotent — no-op when command already points to run path", async () => {
    await installAgentHooks({ usePluginStatusline: true });
    const res2 = await installAgentHooks({ usePluginStatusline: true });
    expect(res2.statusLineInstalled).toBe(false);
    expect(res2.statusLineRemoved).toBe(false);
  });

  it("does not touch a custom user statusLine command", async () => {
    const settingsFile = claudeSettings();
    await fs.mkdir(path.join(tmpHome, ".claude"), { recursive: true });
    await fs.writeFile(settingsFile, JSON.stringify({ statusLine: { type: "command", command: "/custom/statusline.sh" } }));
    const res = await installAgentHooks({ usePluginStatusline: true });
    expect(res.statusLineInstalled).toBe(false);
    const json = await readJson(settingsFile);
    expect(json.statusLine?.command).toBe("/custom/statusline.sh");
  });

  it("updates old version-pinned path to the run wrapper", async () => {
    const settingsFile = claudeSettings();
    await fs.mkdir(path.join(tmpHome, ".claude"), { recursive: true });
    const oldCmd = `${tmpHome}/.claude/plugins/cache/earchibald-plugins/statusline-plugin/0.6.0/bin/statusline.js`;
    await fs.writeFile(settingsFile, JSON.stringify({ statusLine: { type: "command", command: oldCmd } }));
    const res = await installAgentHooks({ usePluginStatusline: true });
    expect(res.statusLineInstalled).toBe(true);
    const json = await readJson(settingsFile);
    expect(json.statusLine?.command).toBe(runPath());
  });

  it("removes the op-managed statusLine when usePluginStatusline is false", async () => {
    await installAgentHooks({ usePluginStatusline: true });
    const res = await installAgentHooks({ usePluginStatusline: false });
    expect(res.statusLineInstalled).toBe(false);
    expect(res.statusLineRemoved).toBe(true);
    const json = await readJson(claudeSettings());
    expect(json.statusLine).toBeUndefined();
  });

  it("does not remove a custom statusLine when usePluginStatusline is false", async () => {
    const settingsFile = claudeSettings();
    await fs.mkdir(path.join(tmpHome, ".claude"), { recursive: true });
    await fs.writeFile(settingsFile, JSON.stringify({ statusLine: { type: "command", command: "/custom/statusline.sh" } }));
    const res = await installAgentHooks({ usePluginStatusline: false });
    expect(res.statusLineRemoved).toBe(false);
    const json = await readJson(settingsFile);
    expect(json.statusLine?.command).toBe("/custom/statusline.sh");
  });

  it("does not install the statusLine when usePluginStatusline is false", async () => {
    const res = await installAgentHooks({ usePluginStatusline: false });
    expect(res.statusLineInstalled).toBe(false);
    try {
      const json = await readJson(claudeSettings());
      expect(json.statusLine).toBeUndefined();
    } catch {
      // settings.json may not exist at all — that's also fine
    }
  });
});
