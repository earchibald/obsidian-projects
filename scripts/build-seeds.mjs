#!/usr/bin/env node
// Build the OP-Test seed-tag ladder by driving op-obsidian via the `obsidian`
// CLI. Each seed builds cumulatively on the previous; on re-run the script
// resets to the baseline (seed/empty) and rebuilds from current plugin
// behavior, so the seeds stay in sync as the schema evolves. (OP-147)
//
// Usage:
//   node scripts/build-seeds.mjs
//
// Preconditions:
//   - OP-Test is open in Obsidian (any window — focus is not required since
//     OP-175; calls route via `vault=OP-Test` explicitly).
//   - OP-Test git working tree is clean (commit/stash any untracked work first).
//   - `seed/empty` tag exists OR HEAD is the desired empty baseline (the
//     script tags HEAD as seed/empty if the tag is absent on first run).
//   - `gh` CLI is authenticated for the github-linked seed.
//
// The seed ladder:
//   seed/empty             — vault config + op-obsidian enabled, no projects
//   seed/scaffolded        — one project (TST / testing)
//   seed/mid-flow          — TST-1 resolved, TST-2 in-progress (with TASKS),
//                            TST-3 open + related to TST-1, TST-4 open
//   seed/github-linked     — adds GHB / github-bound, repo: op-test-fixture
//   seed/multi-project     — adds TWO / second-project, TWO-1 related to TST-3
//   seed/workflow-modules  — OP-181 workflow-module artifacts (global module,
//                            per-project module, per-project workflow file
//                            referencing them, project-level user vars, plus
//                            launchable issue TST-5). Smoke probe target for
//                            `op-explain-workflow` / `op-list-vars`. Run
//                            `node scripts/smoke-workflow-modules.mjs` after
//                            resetting to this seed.

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

import {
  OP_TEST_VAULT,
  assertOpTestVaultOpen,
  fail,
  runGit,
  runObsidian,
  syncBuiltPlugin,
} from "./lib/op-test.mjs";

const FIXTURE_REPO_NAME = "op-test-fixture";
const FIXTURE_CLONE_PATH = join(homedir(), "Documents/OP-Test", FIXTURE_REPO_NAME);
const FIXTURE_DESCRIPTION =
  "Disposable fixture repo for op-obsidian functional testing — no production use.";

assertOpTestVaultOpen();
assertCleanTree();
ensureBaselineTag();

// ensureBaselineTag() just did `git reset --hard seed/empty`, which reverted
// the git-tracked plugin to whatever the baseline pinned. Overlay the
// freshly-built artifact so the rebuilt ladder bakes the *current* plugin into
// every seed commit below — keeps the committed seeds in sync with the plugin
// code (the docstring promise) and matches what reset-test-vault.mjs restores.
for (const c of syncBuiltPlugin()) {
  console.log(`overlaid current ${c.file} (${c.bytes} bytes) into baseline`);
}

build("seed/empty", () => {
  // Baseline; nothing to mutate. Tagging is unconditional below.
});

build("seed/scaffolded", () => {
  dispatch("op-scaffold", { slug: "testing", prefix: "TST" });
});

build("seed/mid-flow", () => {
  // TST-1 — resolved
  dispatch("op-new", {
    project: "testing",
    title: "Set up STATUS",
    priority: "med",
    scope: "Initial scope bullet",
  });
  dispatch("op-work", { issue: "TST-1" });
  dispatch("op-resolve", { issue: "TST-1" });

  // TST-2 — in-progress (op-work creates the initial TASKS note)
  dispatch("op-new", {
    project: "testing",
    title: "Wire up the test runner",
    priority: "med",
    scope: "First sub-bullet\nSecond sub-bullet",
  });
  dispatch("op-work", { issue: "TST-2" });

  // TST-3 — open, related-to TST-1
  const tst3 = dispatch("op-new", {
    project: "testing",
    title: "Document the test conventions",
    priority: "low",
  });
  if (tst3?.path) {
    setRelated(tst3.path, ["TST-1"]);
  }

  // TST-4 — open
  dispatch("op-new", {
    project: "testing",
    title: "Wire up CI smoke",
    priority: "low",
  });
});

build("seed/github-linked", () => {
  ensureGithubFixtureRepo();
  ensureFixtureClone();

  dispatch("op-scaffold", {
    slug: "github-bound",
    prefix: "GHB",
    repo_path: FIXTURE_CLONE_PATH,
  });
  dispatch("op-new", {
    project: "github-bound",
    title: "First GH-linked issue",
    priority: "med",
  });
});

build("seed/multi-project", () => {
  dispatch("op-scaffold", { slug: "second-project", prefix: "TWO" });
  const two1 = dispatch("op-new", {
    project: "second-project",
    title: "Cross-project relation example",
    priority: "med",
  });
  if (two1?.path) {
    setRelated(two1.path, ["TST-3"]);
  }
});

build("seed/workflow-modules", () => {
  // OP-190 (Child 7 of OP-181): introduce one global module, one per-project
  // module, a per-project workflow file referencing them, a project-level
  // `vars:` map (project-default precedence layer), and a launchable issue
  // (TST-5) the smoke probe targets. The artifacts exercise the full
  // OP-184/185/186 module-injection pipeline end-to-end. The downstream smoke
  // harness lives at `scripts/smoke-workflow-modules.mjs`.

  // Global module — kickoff scope, exercises always-on plugin vars + a user
  // var with `name=VALUE` default at the Module-default precedence layer.
  writeVaultFile(
    "Projects/_op-modules/branching.md",
    [
      "---",
      "id: branching",
      "title: Always work in a git worktree",
      "type: workflow-module",
      "scope: kickoff",
      "order: 10",
      "vars:",
      '  - "reviewer_handle=@module-default"',
      "---",
      "",
      "You are working on **{{id}}** ({{title}}) in project `{{project}}` on branch `{{branch}}`.",
      "Always create an isolated worktree before making changes — no exceptions, including",
      "one-line tweaks. Today is {{today}}; ping {{vars.reviewer_handle}} when the PR is up.",
      "",
    ].join("\n"),
  );

  // Per-project module — plan-mode scope, references the global user var so
  // both Module-default → Project-default precedence layers participate.
  writeVaultFile(
    "Projects/testing/MODULES/plan-rules.md",
    [
      "---",
      "id: plan-rules",
      "title: Plan-mode rules for the testing project",
      "type: workflow-module",
      "scope: plan",
      "project: testing",
      "order: 10",
      "vars:",
      '  - "max_files=10"',
      "  - reviewer_handle",
      "---",
      "",
      "Before implementing on **{{id}}**, read no more than {{vars.max_files}} files and",
      "send the plan to {{vars.reviewer_handle}} for sign-off.",
      "",
    ].join("\n"),
  );

  // Per-project lazy module — kickoff scope, lazy: true so it is emitted as a
  // Claude Code skill rather than inlined. The smoke harness asserts the
  // lazy-skill info diagnostic appears and the body text is absent from
  // composed.text. OP-192.
  writeVaultFile(
    "Projects/testing/MODULES/tmux-gotchas.md",
    [
      "---",
      "id: tmux-gotchas",
      "title: Tmux gotchas",
      "type: workflow-module",
      "scope: kickoff",
      "project: testing",
      "lazy: true",
      'description: "Tmux pane/window gotchas — activate when wrangling tmux"',
      "order: 20",
      "---",
      "",
      "Known tmux gotchas:",
      "",
      "- detached panes survive reload",
      "- window indices are not stable",
      "",
    ].join("\n"),
  );

  // Per-project workflow file — references both modules across kickoff + plan
  // steps. Uses the canonical schema=1 frontmatter shape (OP-196).
  writeVaultFile(
    "Projects/testing/WORKFLOW.md",
    [
      "---",
      "type: workflow",
      "schema: 1",
      "project: testing",
      "default_agent: claude",
      "default_model: sonnet",
      "steps:",
      "  - step: kickoff",
      "    modules: [branching, tmux-gotchas]",
      "  - step: plan",
      "    modules: [plan-rules]",
      "---",
      "",
      "Workflow file for the testing project. Composes the global `branching` module at",
      "kickoff, the per-project `tmux-gotchas` lazy module (op-emit-lazy-skills target),",
      "and the per-project `plan-rules` module during plan mode.",
      "",
    ].join("\n"),
  );

  // Project-level vars on STATUS.md so the Project-default precedence layer
  // overrides the global module's `name=VALUE` default for `reviewer_handle`.
  setProjectVars("testing", { reviewer_handle: "@op-test-project" });

  // Launchable test issue. The plugin numbers issues by walking the
  // ISSUES/RESOLVED ISSUES folders, so this lands as TST-5 deterministically
  // (TST-1..4 came from seed/mid-flow). agent: claude makes the smoke probe's
  // `op-explain-workflow` call use the claude profile by default. The created
  // path is read back from `op-new`'s JSON response so a future title tweak
  // doesn't desync this script from the on-disk filename.
  //
  // EXPECTED_SMOKE_ISSUE is the single place to update if a new seed inserted
  // between seed/mid-flow and seed/workflow-modules changes the issue counter.
  // The guard below and the smoke-config.json write both reference this constant,
  // so a numbering change requires only one edit here.
  const EXPECTED_SMOKE_ISSUE = "TST-5";
  const tst5 = dispatch("op-new", {
    project: "testing",
    title: "Workflow modules smoke target",
    priority: "med",
    scope: "Smoke probe target for op-explain-workflow + op-list-vars.",
  });
  if (!tst5?.path || !tst5?.issueId) {
    fail(
      "seed/workflow-modules: op-new for the testing-project smoke target did not return path+issueId; " +
        "cannot stamp agent: claude on the issue.",
    );
  }
  if (tst5.issueId !== EXPECTED_SMOKE_ISSUE) {
    fail(
      `seed/workflow-modules: expected op-new to return ${EXPECTED_SMOKE_ISSUE} (cumulative ladder includes TST-1..4 from seed/mid-flow), got ${tst5.issueId}. ` +
        "If a new seed has been inserted between seed/mid-flow and seed/workflow-modules that adds testing-project issues, " +
        `update EXPECTED_SMOKE_ISSUE (currently "${EXPECTED_SMOKE_ISSUE}") to match and re-run.`,
    );
  }
  setIssueAgent(tst5.path, "claude");

  // Write a machine-readable config so the smoke harness doesn't hardcode the
  // issue ID. The file is committed into the seed, so `reset-test-vault
  // workflow-modules` always lands this exact JSON on disk before the harness
  // reads it. If a future seed reshuffles issue numbering the build guard above
  // catches it at seed-build time, and only EXPECTED_SMOKE_ISSUE needs updating
  // — the harness itself stays free of hardcoded IDs.
  writeVaultFile(
    "Projects/_scratch/smoke-config.json",
    JSON.stringify({ issue: tst5.issueId, project: "testing" }, null, 2) + "\n",
  );
});

// OP-255: managed-discipline seed. Cumulative on top of seed/workflow-modules —
// scaffolds a fresh `discipline` project, opens a single issue, calls op-work
// to seed the initial TASK, and adds a second TASK via op-task-create. The
// post-state is the cleanest possible illustration of every plugin-owned note
// carrying `op_managed: true` and the audit log being non-empty. The Phase 1
// smoke harness (separate file) targets this seed.
build("seed/managed-discipline", () => {
  dispatch("op-scaffold", {
    slug: "discipline",
    prefix: "DSC",
    title: "Managed-discipline smoke target",
    priority: "med",
    scope: "Verify op_managed: true is written everywhere.",
  });
  // Plugin auto-numbered the seed issue as DSC-1.
  dispatch("op-work", { issue: "DSC-1" });
  dispatch("op-task-create", {
    issue: "DSC-1",
    title: "Phase 1 endpoints exercised",
    body: "Created via op-task-create at seed-build time.",
  });
  dispatch("op-set-tasks", {
    issue: "DSC-1",
    body: [
      "- [ ] DSC-1.1 — work",
      "- [ ] DSC-1.2 — Phase 1 endpoints exercised",
    ].join("\n"),
  });
});

console.log("\nseed ladder built and tagged. Verify with `git -C <op-test> tag -l seed/*`.");

// ---------------------------------------------------------------------------

function assertCleanTree() {
  const r = runGit(["status", "--porcelain"]);
  if (r.stdout.trim()) {
    fail(
      `OP-Test working tree is not clean. Commit or stash before running build-seeds:\n${r.stdout}`,
    );
  }
}

// First run: tag HEAD as seed/empty if no seed tag exists yet.
// Subsequent runs: reset --hard to seed/empty before rebuilding so the
// ladder is idempotent.
function ensureBaselineTag() {
  const tagExists =
    runGit(["rev-parse", "--verify", "refs/tags/seed/empty"], { allowFail: true })
      .status === 0;
  if (!tagExists) {
    console.log("seed/empty tag absent — tagging current HEAD as the baseline");
    runGit(["tag", "seed/empty", "HEAD"]);
  } else {
    console.log("resetting OP-Test to seed/empty for idempotent rebuild");
    runGit(["reset", "--hard", "seed/empty"]);
    runGit(["clean", "-fd"]);
  }
}

function build(tag, mutate) {
  console.log(`\n=== building ${tag} ===`);
  if (tag !== "seed/empty") {
    mutate();
    runGit(["add", "-A"]);
    const status = runGit(["status", "--porcelain"]).stdout.trim();
    if (status) {
      runGit(["commit", "-m", `seed: ${tag.slice("seed/".length)}`]);
    } else {
      console.log("(no vault changes — empty commit skipped)");
    }
  }
  runGit(["tag", "-f", tag]);
  console.log(`tagged ${tag}`);
}

// Run an `obsidian op-*` command with key=value args. Returns the parsed JSON
// payload from Projects/_scratch/op-last-response.md (so callers can pull
// `path`, `id`, etc. without re-parsing stdout).
function dispatch(verb, args) {
  const cliArgs = [verb, ...Object.entries(args).map(([k, v]) => `${k}=${v}`)];
  console.log(`  obsidian ${cliArgs.join(" ")}`);
  runObsidian(cliArgs);
  return readLastResponse();
}

function readLastResponse() {
  const responsePath = join(OP_TEST_VAULT, "Projects/_scratch/op-last-response.md");
  if (!existsSync(responsePath)) return null;
  // The plugin writes a fenced JSON block — extract it. Cheapest: read raw
  // and scan for the first {...} object.
  const r = spawnSync("cat", [responsePath], { encoding: "utf8" });
  if (r.status !== 0) return null;
  const match = r.stdout.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// Set a `related:` frontmatter list on a vault note via processFrontMatter.
// Stored as an array even for a single value so the field round-trips as a
// list (Obsidian's frontmatter editor renders this as a multi-value tag UI).
function setRelated(vaultRelativePath, ids) {
  const code =
    `(async()=>{const f=app.vault.getAbstractFileByPath(${JSON.stringify(vaultRelativePath)});` +
    `if(!f){return {error:"not found:"+${JSON.stringify(vaultRelativePath)}}}` +
    `await app.fileManager.processFrontMatter(f, fm=>{fm.related=${JSON.stringify(ids)}});` +
    `return {ok:true,path:f.path,related:${JSON.stringify(ids)}}})()`;
  runObsidian(["eval", `code=${code}`]);
}

// Create a vault file (or overwrite if it already exists). Goes through
// `app.vault.create` / `app.vault.modify` so the metadataCache picks up new
// frontmatter immediately — important for workflow-module files the loader
// reads via `app.vault.getMarkdownFiles()` + `metadataCache.getFileCache()`.
// Parent folders are created on demand via `adapter.mkdir`.
function writeVaultFile(vaultRelativePath, content) {
  const code =
    `(async()=>{` +
    `const path=${JSON.stringify(vaultRelativePath)};` +
    `const content=${JSON.stringify(content)};` +
    `const adapter=app.vault.adapter;` +
    `const lastSlash=path.lastIndexOf("/");` +
    `if(lastSlash>0){` +
    `const dir=path.slice(0,lastSlash);` +
    `if(!(await adapter.exists(dir))){await adapter.mkdir(dir);}` +
    `}` +
    `const existing=app.vault.getAbstractFileByPath(path);` +
    `if(existing){await app.vault.modify(existing,content);return {ok:true,path,mode:"modify"};}` +
    `const f=await app.vault.create(path,content);` +
    `return {ok:true,path:f.path,mode:"create"};` +
    `})()`;
  runObsidian(["eval", `code=${code}`]);
}

// Merge a `vars:` map into a project's STATUS.md frontmatter via
// processFrontMatter. Stored as a YAML map (object), matching what
// `readProjectVars` in `explainWorkflow.ts` expects.
function setProjectVars(slug, vars) {
  const statusPath = `Projects/${slug}/STATUS.md`;
  const code =
    `(async()=>{` +
    `const f=app.vault.getAbstractFileByPath(${JSON.stringify(statusPath)});` +
    `if(!f){return {error:"not found:"+${JSON.stringify(statusPath)}}}` +
    `await app.fileManager.processFrontMatter(f,fm=>{fm.vars=${JSON.stringify(vars)};});` +
    `return {ok:true,path:f.path,vars:${JSON.stringify(vars)}};` +
    `})()`;
  runObsidian(["eval", `code=${code}`]);
}

// Set the `agent:` frontmatter field on an issue note. Used to make TST-5's
// agent deterministic so the smoke probe's `op-explain-workflow` call resolves
// the same agent profile every run regardless of the vault's defaultAgent.
function setIssueAgent(vaultRelativePath, agent) {
  const code =
    `(async()=>{` +
    `const f=app.vault.getAbstractFileByPath(${JSON.stringify(vaultRelativePath)});` +
    `if(!f){return {error:"not found:"+${JSON.stringify(vaultRelativePath)}}}` +
    `await app.fileManager.processFrontMatter(f,fm=>{fm.agent=${JSON.stringify(agent)};});` +
    `return {ok:true,path:f.path,agent:${JSON.stringify(agent)}};` +
    `})()`;
  runObsidian(["eval", `code=${code}`]);
}

function ensureGithubFixtureRepo() {
  const whoami = spawnSync("gh", ["api", "user", "--jq", ".login"], { encoding: "utf8" });
  if (whoami.status !== 0) {
    fail(`gh CLI not authenticated. Run \`gh auth login\` and re-run.\n${whoami.stderr}`);
  }
  const user = whoami.stdout.trim();
  if (!user) fail("gh api user returned no login");
  const slug = `${user}/${FIXTURE_REPO_NAME}`;

  const view = spawnSync("gh", ["repo", "view", slug, "--json", "nameWithOwner"], {
    encoding: "utf8",
  });
  if (view.status === 0) {
    let actualSlug;
    try {
      actualSlug = JSON.parse(view.stdout).nameWithOwner;
    } catch {
      fail(
        `Could not parse \`gh repo view\` JSON for ${slug}. Raw output:\n${view.stdout}`,
      );
    }
    if (!actualSlug) {
      fail(`\`gh repo view\` returned no nameWithOwner for ${slug}. Raw output:\n${view.stdout}`);
    }
    // GitHub nameWithOwner uses the API-canonical casing for both owner and
    // repo name; compare directly (no case folding) so a differently-owned
    // repo with a similar name isn't silently accepted.
    if (actualSlug !== slug) {
      fail(
        `GH repo ${slug} exists but is owned by a different account: ${actualSlug}.\n` +
          `Ensure \`gh auth status\` is authenticated as ${user} before re-running.`,
      );
    }
    console.log(`  GH repo ${slug} already exists — reusing`);
    return;
  }
  console.log(`  creating private GH repo ${slug}`);
  const create = spawnSync(
    "gh",
    [
      "repo",
      "create",
      slug,
      "--private",
      "--description",
      FIXTURE_DESCRIPTION,
      "--add-readme",
    ],
    { encoding: "utf8" },
  );
  if (create.status !== 0) {
    fail(`gh repo create failed: ${create.stderr || create.stdout}`);
  }
}

function ensureFixtureClone() {
  if (existsSync(join(FIXTURE_CLONE_PATH, ".git"))) {
    console.log(`  fixture clone already present at ${FIXTURE_CLONE_PATH}`);
    return;
  }
  console.log(`  cloning fixture repo into ${FIXTURE_CLONE_PATH}`);
  const whoami = spawnSync("gh", ["api", "user", "--jq", ".login"], { encoding: "utf8" });
  const user = whoami.stdout.trim();
  const clone = spawnSync(
    "gh",
    ["repo", "clone", `${user}/${FIXTURE_REPO_NAME}`, FIXTURE_CLONE_PATH],
    { encoding: "utf8" },
  );
  if (clone.status !== 0) {
    fail(`gh repo clone failed: ${clone.stderr || clone.stdout}`);
  }
}
