#!/usr/bin/env node
// Reset OP-Test to a named seed tag, then nudge Obsidian to re-read state.
// (OP-147)
//
// Usage:
//   node scripts/reset-test-vault.mjs <seed>
//
//   <seed> is the bare seed name; the tag prefix is added automatically:
//     empty | scaffolded | mid-flow | github-linked | multi-project
//   Or pass the full tag form: seed/<name>.

import {
  OP_TEST_VAULT,
  assertActiveVaultIsOpTest,
  fail,
  runGit,
  runObsidian,
} from "./lib/op-test.mjs";

const VALID_SEEDS = new Set([
  "empty",
  "scaffolded",
  "mid-flow",
  "github-linked",
  "multi-project",
]);

const arg = process.argv[2];
if (!arg) {
  fail(
    "usage: node scripts/reset-test-vault.mjs <seed>\n" +
      `  valid seeds: ${[...VALID_SEEDS].join(" | ")}`,
  );
}

const bare = arg.startsWith("seed/") ? arg.slice("seed/".length) : arg;
if (!VALID_SEEDS.has(bare)) {
  fail(
    `Unknown seed: ${arg}\n` +
      `  valid seeds: ${[...VALID_SEEDS].join(" | ")}`,
  );
}
const tag = `seed/${bare}`;

assertActiveVaultIsOpTest();

const tagCheck = runGit(["rev-parse", "--verify", `refs/tags/${tag}`], {
  allowFail: true,
});
if (tagCheck.status !== 0) {
  fail(
    `Seed tag ${tag} does not exist in ${OP_TEST_VAULT}.\n` +
      `Run \`node scripts/build-seeds.mjs\` first to populate the seed ladder.`,
  );
}

console.log(`resetting ${OP_TEST_VAULT} to ${tag} …`);
runGit(["reset", "--hard", tag]);
runGit(["clean", "-fd"]);

console.log("reloading op-obsidian so Obsidian picks up vault state …");
const reload = runObsidian(["plugin:reload", "id=op-obsidian"], { allowFail: true });
if (reload.status !== 0) {
  console.error(
    "plugin:reload failed — vault is reset on disk but Obsidian may show stale state. " +
      "Reload the plugin manually from Obsidian's command palette.",
  );
  process.exit(reload.status ?? 1);
}

console.log(`done — OP-Test is at ${tag}.`);
