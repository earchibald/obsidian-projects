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
//   1. `op-explain-workflow id=TST-5 mode=kickoff agent=claude` —
//        - `composed.text` contains the rendered global `branching` module
//          (literal id substituted in, project-default override applied).
//        - `composed.chunks` lists a `branching` chunk with kickoff scope.
//        - No error-severity diagnostics.
//   2. `op-explain-workflow id=TST-5 mode=plan agent=claude` —
//        - `composed.text` contains the rendered per-project `plan-rules`
//          module body (project-default override applied for `reviewer_handle`).
//        - `composed.chunks` lists a `plan-rules` chunk with plan scope.
//        - No error-severity diagnostics.
//   3. `op-list-vars project=testing issue=TST-5` —
//        - `context.hasContext === true`.
//        - `vars[]` non-empty and includes an `id` row resolving to "TST-5".
//
// On any assertion failure, prints a concise FAIL summary with the offending
// payload excerpt and exits non-zero so callers can chain this from CI / a
// PR-check shell script.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { OP_TEST_VAULT, assertOpTestVaultOpen, fail, runObsidian } from "./lib/op-test.mjs";

const SCRATCH = join(OP_TEST_VAULT, "Projects/_scratch/op-last-response.md");

const ISSUE = "TST-5";
const PROJECT = "testing";
const AGENT = "claude";

assertOpTestVaultOpen();

let failed = 0;

console.log("smoke-workflow-modules: probing op-explain-workflow + op-list-vars\n");

// ---- 1. op-explain-workflow id=TST-5 mode=kickoff -------------------------
const kickoff = explainWorkflow(ISSUE, "kickoff", AGENT);
expect("kickoff: payload.issueId === TST-5", kickoff.issueId === ISSUE, kickoff);
expect("kickoff: payload.project === testing", kickoff.project === PROJECT, kickoff);
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
expect(
  "kickoff: project-default reviewer_handle override is rendered (not the module default)",
  kickoff.composed?.text?.includes("@op-test-project") &&
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

// ---- 2. op-explain-workflow id=TST-5 mode=plan ----------------------------
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

// ---- 3. op-list-vars project=testing issue=TST-5 --------------------------
const listVars = listVarsForIssue(PROJECT, ISSUE);
expect("list-vars: context.hasContext === true", listVars.context?.hasContext === true, listVars);
expect("list-vars: context.issueId === TST-5", listVars.context?.issueId === ISSUE, listVars);
expect(
  "list-vars: registry has at least one entry",
  Array.isArray(listVars.vars) && listVars.vars.length > 0,
  listVars,
);
const idRow = listVars.vars?.find((v) => v.name === "id");
expect("list-vars: id row resolves to TST-5", idRow?.currentValue === ISSUE, idRow);

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
