#!/usr/bin/env node
// Re-runnable smoke harness for the OP-181 workflow-module pipeline.
// (OP-190 / Child 7 of OP-181)
//
// Usage:
//   node scripts/smoke-workflow-modules.mjs
//
// Preconditions:
//   - OP-Test is open in Obsidian (any window — focus is not required since
//     OP-175; calls route via `vault=OP-Test` explicitly).
//   - OP-Test is reset to `seed/workflow-modules` (or a tag built on top of
//     it). Run `node scripts/reset-test-vault.mjs workflow-modules` first.
//
// What it asserts:
//   1. `op-explain-workflow id=<issue> mode=kickoff agent=claude` —
//        - `composed.text` contains the rendered global `branching` module
//          (literal id substituted in, project-default override applied).
//        - `composed.chunks` lists a `branching` chunk with kickoff scope.
//        - No error-severity diagnostics.
//   2. `op-explain-workflow id=<issue> mode=plan agent=claude` —
//        - `composed.text` contains the rendered per-project `plan-rules`
//          module body (project-default override applied for `reviewer_handle`).
//        - `composed.chunks` lists a `plan-rules` chunk with plan scope.
//        - No error-severity diagnostics.
//   3. `op-list-vars project=<project> issue=<issue>` —
//        - `context.hasContext === true`.
//        - `vars[]` non-empty and includes an `id` row resolving to the issue.
//
// Issue ID and project are read from Projects/_scratch/smoke-config.json (written
// by build-seeds.mjs during the seed/workflow-modules build) so this file never
// hardcodes the issue number. On the current ladder: issue=TST-5, project=testing.
//
// On any assertion failure, prints a concise FAIL summary with the offending
// payload excerpt and exits non-zero so callers can chain this from CI / a
// PR-check shell script.

import { existsSync, readFileSync } from "node:fs";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { OP_TEST_VAULT, assertOpTestVaultOpen, fail, runObsidian } from "./lib/op-test.mjs";

const SCRATCH = join(OP_TEST_VAULT, "Projects/_scratch/op-last-response.md");

// Read the issue ID and project from the smoke-config written by build-seeds
// during the seed/workflow-modules seed build. This keeps the harness free of
// hardcoded issue IDs — if future seeds reshuffle the issue counter, only
// build-seeds.mjs (and its guard) needs updating, not this file.
const SMOKE_CONFIG_PATH = join(OP_TEST_VAULT, "Projects/_scratch/smoke-config.json");
if (!existsSync(SMOKE_CONFIG_PATH)) {
  fail(
    `smoke-config.json not found at ${SMOKE_CONFIG_PATH}.\n` +
      "Run `node scripts/reset-test-vault.mjs workflow-modules` to restore the seed " +
      "(or `node scripts/build-seeds.mjs` if the seed ladder hasn't been built yet).",
  );
}
let smokeConfig;
try {
  smokeConfig = JSON.parse(readFileSync(SMOKE_CONFIG_PATH, "utf8"));
} catch (e) {
  fail(`Failed to parse smoke-config.json: ${e.message}`);
}
if (!smokeConfig.issue || !smokeConfig.project) {
  fail(`smoke-config.json is missing required fields (issue, project): ${JSON.stringify(smokeConfig)}`);
}

const ISSUE = smokeConfig.issue;
const PROJECT = smokeConfig.project;
const AGENT = "claude";

assertOpTestVaultOpen();

let failed = 0;

console.log("smoke-workflow-modules: probing op-explain-workflow + op-list-vars\n");

// ---- 1. op-explain-workflow id=<ISSUE> mode=kickoff -----------------------
const kickoff = explainWorkflow(ISSUE, "kickoff", AGENT);
expect(`kickoff: payload.issueId === ${ISSUE}`, kickoff.issueId === ISSUE, kickoff);
expect(`kickoff: payload.project === ${PROJECT}`, kickoff.project === PROJECT, kickoff);
expect("kickoff: payload.mode === kickoff", kickoff.mode === "kickoff", kickoff);
expect(
  "kickoff: composed.text mentions the issue id",
  kickoff.composed?.text?.includes(`**${ISSUE}**`),
  kickoff,
);
expect(
  "kickoff: composed.text contains the global branching module's body",
  kickoff.composed?.text?.includes("Always create an isolated worktree"),
  kickoff,
);
// composed.text is the final rendered prompt body — not a diagnostic block.
// @op-test-project must appear (Project-default layer wins over Module-default)
// and @module-default must be absent (the name=VALUE default was superseded).
// These are split into two assertions so a failure identifies which half broke.
expect(
  "kickoff: project-default reviewer_handle (@op-test-project) present in composed body",
  kickoff.composed?.text?.includes("@op-test-project"),
  kickoff,
);
expect(
  "kickoff: module-default reviewer_handle (@module-default) absent from composed body",
  !kickoff.composed?.text?.includes("@module-default"),
  kickoff,
);
expect(
  "kickoff: composed.chunks lists the branching module at kickoff scope",
  Array.isArray(kickoff.composed?.chunks) &&
    kickoff.composed.chunks.some((c) => c.moduleId === "branching" && c.scope === "kickoff"),
  kickoff,
);
expect(
  "kickoff: zero error-severity diagnostics",
  countSeverity(kickoff.diagnostics, "error") === 0,
  kickoff.diagnostics,
);

// OP-192: lazy-skill assertions for the tmux-gotchas module -------------------
const LAZY_MODULE_ID = "tmux-gotchas";
const LAZY_SKILL_NAME = "op-module-tmux-gotchas";
const LAZY_BODY_SNIPPET = "Known tmux gotchas";

// 1. diagnostics must include an info-severity lazy-skill entry for tmux-gotchas
expect(
  "kickoff: diagnostics include lazy-skill info for tmux-gotchas",
  Array.isArray(kickoff.diagnostics) &&
    kickoff.diagnostics.some(
      (d) => d.code === "lazy-skill" && d.severity === "info" && d.moduleId === LAZY_MODULE_ID,
    ),
  kickoff.diagnostics,
);

// 2. tmux-gotchas body text must NOT be inlined in composed.text
expect(
  "kickoff: lazy tmux-gotchas body NOT inlined in composed.text",
  !kickoff.composed?.text?.includes(LAZY_BODY_SNIPPET),
  { textSnippet: kickoff.composed?.text?.slice(0, 400) },
);

// OP-192: op-emit-lazy-skills assertions --------------------------------------
const EMIT_TMP = mkdtempSync(join(tmpdir(), "op-192-smoke-"));

// 5. Prune: plant a stale op-module-* dir before first emit so pruning is exercised
const STALE_DIR = join(EMIT_TMP, ".claude", "skills", "op-module-zzz-stale");
mkdirSync(STALE_DIR, { recursive: true });
writeFileSync(join(STALE_DIR, "SKILL.md"), "stale content\n", "utf8");

// 3. First emit: write skills into EMIT_TMP
const emit1 = emitLazySkills(ISSUE, EMIT_TMP);
expect("emit: ok === true", emit1.ok === true, emit1);

const SKILL_MD_PATH = join(EMIT_TMP, ".claude", "skills", LAZY_SKILL_NAME, "SKILL.md");
const GITIGNORE_PATH = join(EMIT_TMP, ".claude", "skills", LAZY_SKILL_NAME, ".gitignore");

expect(
  `emit: SKILL.md exists at ${SKILL_MD_PATH}`,
  existsSync(SKILL_MD_PATH),
  { checked: SKILL_MD_PATH },
);
if (existsSync(SKILL_MD_PATH)) {
  const skillMdContent = readFileSync(SKILL_MD_PATH, "utf8");
  expect(
    "emit: SKILL.md contains name: op-module-tmux-gotchas",
    skillMdContent.includes(`name: ${LAZY_SKILL_NAME}`),
    { skillMdContent },
  );
}
expect(
  `emit: .gitignore exists at ${GITIGNORE_PATH}`,
  existsSync(GITIGNORE_PATH),
  { checked: GITIGNORE_PATH },
);
if (existsSync(GITIGNORE_PATH)) {
  const gitignoreContent = readFileSync(GITIGNORE_PATH, "utf8");
  expect(
    'emit: .gitignore content is exactly "*\\n"',
    gitignoreContent === "*\n",
    { gitignoreContent },
  );
}
expect(
  "emit: response payload lists the written SKILL.md path",
  Array.isArray(emit1.written) && emit1.written.some((p) => p.endsWith("SKILL.md")),
  { written: emit1.written },
);

// 5 (continued). stale dir must have been pruned
expect(
  "emit: stale op-module-zzz-stale dir was pruned",
  !existsSync(STALE_DIR),
  { checked: STALE_DIR },
);
expect(
  "emit: response payload lists the pruned stale dir",
  Array.isArray(emit1.pruned) && emit1.pruned.some((p) => p.includes("op-module-zzz-stale")),
  { pruned: emit1.pruned },
);

// 4. Idempotency: second emit succeeds and SKILL.md still present
const emit2 = emitLazySkills(ISSUE, EMIT_TMP);
expect("emit idempotency: ok === true on second run", emit2.ok === true, emit2);
expect(
  "emit idempotency: SKILL.md still present after second emit",
  existsSync(SKILL_MD_PATH),
  { checked: SKILL_MD_PATH },
);

// 6. Clean up
rmSync(EMIT_TMP, { recursive: true, force: true });
console.log(`  (cleaned up temp dir ${EMIT_TMP})`);

// ---- 2. op-explain-workflow id=<ISSUE> mode=plan --------------------------
const plan = explainWorkflow(ISSUE, "plan", AGENT);
expect("plan: payload.mode === plan", plan.mode === "plan", plan);
expect(
  "plan: composed.text contains the per-project plan-rules module body",
  plan.composed?.text?.includes("Before implementing on") &&
    plan.composed?.text?.includes(`**${ISSUE}**`),
  plan,
);
expect(
  "plan: project-default reviewer_handle override is rendered",
  plan.composed?.text?.includes("@op-test-project"),
  plan,
);
expect(
  "plan: composed.chunks lists the plan-rules module at plan scope",
  Array.isArray(plan.composed?.chunks) &&
    plan.composed.chunks.some((c) => c.moduleId === "plan-rules" && c.scope === "plan"),
  plan,
);
expect(
  "plan: zero error-severity diagnostics",
  countSeverity(plan.diagnostics, "error") === 0,
  plan.diagnostics,
);

// ---- 3. op-list-vars project=<PROJECT> issue=<ISSUE> ---------------------
const listVars = listVarsForIssue(PROJECT, ISSUE);
// Fail loudly if op-list-vars returned a top-level error (e.g. project slug
// mismatch, handler throw) rather than silently passing the structural checks
// below with undefined context fields.
if (listVars.error) {
  fail(
    `op-list-vars project=${PROJECT} issue=${ISSUE} returned an error: ${listVars.error}\n` +
      "Check that the issue's project slug matches the project argument passed to op-list-vars.",
  );
}
expect("list-vars: context.hasContext === true", listVars.context?.hasContext === true, listVars);
expect(`list-vars: context.issueId === ${ISSUE}`, listVars.context?.issueId === ISSUE, listVars);
expect(
  "list-vars: registry has at least one entry",
  Array.isArray(listVars.vars) && listVars.vars.length > 0,
  listVars,
);
const idRow = listVars.vars?.find((v) => v.name === "id");
expect(`list-vars: id row resolves to ${ISSUE}`, idRow?.currentValue === ISSUE, idRow);

// ---- summary --------------------------------------------------------------
if (failed > 0) {
  console.error(`\n${failed} assertion${failed === 1 ? "" : "s"} FAILED`);
  process.exit(1);
}
console.log(`\nALL PASS — workflow-module pipeline composes cleanly for ${ISSUE}`);

// ---------------------------------------------------------------------------

function explainWorkflow(issue, mode, agent) {
  runObsidian([
    "op-explain-workflow",
    `issue=${issue}`,
    `mode=${mode}`,
    `agent=${agent}`,
  ]);
  return readScratchPayload();
}

function listVarsForIssue(project, issue) {
  runObsidian(["op-list-vars", `project=${project}`, `issue=${issue}`]);
  return readScratchPayload();
}

function emitLazySkills(issue, dir) {
  runObsidian(["op-emit-lazy-skills", `issue=${issue}`, `dir=${dir}`]);
  return readScratchPayload();
}

function readScratchPayload() {
  if (!existsSync(SCRATCH)) {
    fail(`expected scratch payload at ${SCRATCH} but it does not exist`);
  }
  const raw = readFileSync(SCRATCH, "utf8");
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) fail(`could not extract JSON object from ${SCRATCH}`);
  try {
    return JSON.parse(match[0]);
  } catch (e) {
    fail(`failed to parse scratch payload as JSON: ${e.message}\n${raw}`);
  }
}

function countSeverity(diagnostics, severity) {
  if (!Array.isArray(diagnostics)) return 0;
  return diagnostics.filter((d) => d?.severity === severity).length;
}

function expect(label, ok, evidence) {
  if (ok) {
    console.log(`  PASS  ${label}`);
    return;
  }
  failed += 1;
  console.error(`  FAIL  ${label}`);
  if (evidence !== undefined) {
    const summary = JSON.stringify(evidence, null, 2);
    const trimmed = summary.length > 800 ? `${summary.slice(0, 800)}\n...[truncated]` : summary;
    console.error(`        evidence: ${trimmed}`);
  }
}
