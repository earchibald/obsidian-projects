#!/usr/bin/env node
// Re-runnable smoke harness for OP-255 (Phase 1 managed-note discipline).
//
// Usage:
//   node scripts/reset-test-vault.mjs managed-discipline
//   node scripts/smoke-managed-discipline.mjs
//
// What it asserts on the post-seed/managed-discipline state:
//   1. The seed-time issue (DSC-1) and its TASK notes carry op_managed: true.
//   2. The audit log Projects/_scratch/op-audit.jsonl exists and contains at
//      least one line for op-scaffold, op-new, op-work, op-task-create, and
//      op-set-tasks (the seed-time invocations).
//   3. Each line is valid JSON, encodes its keys alphabetically, and carries
//      ts + cmd at minimum.
//   4. A live op-set-section + op-task-set-status round-trip emits new audit
//      lines and the touched notes still carry op_managed: true.
//
// On any assertion failure prints a concise FAIL summary and exits non-zero.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  OP_TEST_VAULT,
  assertOpTestVaultOpen,
  fail,
  runObsidian,
} from "./lib/op-test.mjs";

const AUDIT_PATH = join(OP_TEST_VAULT, "Projects/_scratch/op-audit.jsonl");
const SCRATCH = join(OP_TEST_VAULT, "Projects/_scratch/op-last-response.md");
const ISSUE_PATH = join(
  OP_TEST_VAULT,
  "Projects/discipline/ISSUES/DSC-1 Managed-discipline smoke target.md",
);
const TASK_DIR = join(OP_TEST_VAULT, "Projects/discipline/TASKS");

assertOpTestVaultOpen();

let failed = 0;

console.log("smoke-managed-discipline: validating Phase 1 endpoints + audit\n");

// ---- 1. op_managed flags on managed notes --------------------------------
expect("issue note exists on disk", existsSync(ISSUE_PATH));
const issueText = readFileSync(ISSUE_PATH, "utf8");
expect(
  "issue frontmatter carries op_managed: true",
  /^op_managed:\s*true$/m.test(issueText),
  issueText.split("---")[1] ?? "",
);

// At least DSC-1.1 (seeded by op-work) and DSC-1.2 (created via op-task-create).
const taskFiles = readDir(TASK_DIR).filter((n) => n.startsWith("DSC-1."));
expect("at least 2 TASK notes for DSC-1", taskFiles.length >= 2, taskFiles);
for (const name of taskFiles) {
  const text = readFileSync(join(TASK_DIR, name), "utf8");
  expect(
    `TASK ${name} frontmatter carries op_managed: true`,
    /^op_managed:\s*true$/m.test(text),
    text.split("---")[1] ?? "",
  );
}

// ---- 2. audit log shape + content ----------------------------------------
expect("audit log exists at _scratch/op-audit.jsonl", existsSync(AUDIT_PATH));
const auditLines = readFileSync(AUDIT_PATH, "utf8")
  .split("\n")
  .filter((l) => l.length > 0);
expect("audit log non-empty", auditLines.length >= 1);

const seenCmds = new Set();
for (const line of auditLines) {
  let parsed;
  try {
    parsed = JSON.parse(line);
  } catch (e) {
    fail(`audit line is not valid JSON: ${line}`);
  }
  expect(`audit line carries ts (${truncate(line)})`, typeof parsed.ts === "string", parsed);
  expect(`audit line carries cmd (${truncate(line)})`, typeof parsed.cmd === "string", parsed);
  // Verify alphabetical key order — encodeAuditLine sorts keys for greppable diffs.
  const keys = Object.keys(parsed);
  const sorted = [...keys].sort();
  expect(
    `audit line keys are alphabetical (${truncate(line)})`,
    keys.join(",") === sorted.join(","),
    { keys, sorted },
  );
  if (typeof parsed.cmd === "string") seenCmds.add(parsed.cmd);
}

for (const cmd of [
  "op-scaffold",
  "op-new",
  "op-work",
  "op-task-create",
  "op-set-tasks",
]) {
  expect(`audit log includes ${cmd}`, seenCmds.has(cmd), [...seenCmds]);
}

// ---- 3. live round-trip: op-set-section + op-task-set-status -------------
const beforeCount = auditLines.length;

runObsidian([
  "op-set-section",
  "issue=DSC-1",
  "name=Plan",
  "content=Smoke harness verified Phase 1 audit emission.",
]);
const setSectionResp = readScratch();
expect("op-set-section ok=true", setSectionResp.ok === true, setSectionResp);

runObsidian([
  "op-task-set-status",
  "taskId=DSC-1.2",
  "status=completed",
]);
const setStatusResp = readScratch();
expect(
  "op-task-set-status ok=true",
  setStatusResp.ok === true,
  setStatusResp,
);

const afterLines = readFileSync(AUDIT_PATH, "utf8")
  .split("\n")
  .filter((l) => l.length > 0);
expect(
  "audit log gained at least 2 lines after live round-trip",
  afterLines.length >= beforeCount + 2,
  { before: beforeCount, after: afterLines.length },
);
const newCmds = new Set(
  afterLines.slice(beforeCount).map((l) => {
    try {
      return JSON.parse(l).cmd;
    } catch {
      return null;
    }
  }),
);
expect("new audit lines include op-set-section", newCmds.has("op-set-section"));
expect("new audit lines include op-task-set-status", newCmds.has("op-task-set-status"));

if (failed > 0) {
  console.error(`\nsmoke-managed-discipline: FAIL — ${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nsmoke-managed-discipline: PASS");

// --- helpers ---------------------------------------------------------------

function expect(label, ok, ctx) {
  if (ok) {
    console.log(`  ✓ ${label}`);
    return;
  }
  failed += 1;
  console.error(`  ✗ ${label}`);
  if (ctx !== undefined) {
    console.error(`      context: ${JSON.stringify(ctx).slice(0, 400)}`);
  }
}

function readScratch() {
  if (!existsSync(SCRATCH)) {
    fail(`expected scratch payload at ${SCRATCH}`);
  }
  const raw = readFileSync(SCRATCH, "utf8");
  const fenced = raw.match(/```json\n([\s\S]*?)\n```/);
  const json = fenced ? fenced[1] : raw;
  try {
    return JSON.parse(json);
  } catch (e) {
    fail(`scratch payload is not JSON:\n${raw.slice(0, 400)}`);
  }
}

function readDir(p) {
  try {
    return readdirSync(p);
  } catch {
    return [];
  }
}

function truncate(s) {
  return s.length > 80 ? s.slice(0, 77) + "..." : s;
}
