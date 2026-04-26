#!/usr/bin/env node
// One-time, idempotent: remove dev-installed op-obsidian artifacts from
// Agent-Vault, leaving `data.json` (user settings) intact so a future BRAT
// install picks them up. (OP-147)
//
// Usage:
//   node scripts/agent-vault-detach.mjs
//
// After running, install op-obsidian into Agent-Vault via BRAT — see the
// printed BRAT-install instructions at the end. This script does NOT touch
// the OP-Test vault.

import { existsSync, statSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const AGENT_VAULT = join(homedir(), "work/Agent-Vault");
const PLUGINS_DIR = join(AGENT_VAULT, ".obsidian/plugins");
const OP_DIR = join(PLUGINS_DIR, "op-obsidian");
const BRAT_DIR = join(PLUGINS_DIR, "obsidian42-brat");

const REMOVE = ["main.js", "manifest.json"];
const PRESERVE = ["data.json"];

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

if (!existsSync(AGENT_VAULT)) {
  console.log(
    `Agent-Vault not found at ${AGENT_VAULT} — nothing to detach. Idempotent no-op.`,
  );
  process.exit(0);
}

if (!existsSync(BRAT_DIR)) {
  fail(
    `BRAT plugin not installed at ${BRAT_DIR}.\n` +
      `Install obsidian42-brat in Agent-Vault first (Community Plugins → Browse → "BRAT"),\n` +
      `then re-run this script.`,
  );
}

if (!existsSync(OP_DIR)) {
  console.log(`op-obsidian dev folder already absent at ${OP_DIR} — idempotent no-op.`);
  printBratInstructions();
  process.exit(0);
}

let removedCount = 0;
for (const f of REMOVE) {
  const p = join(OP_DIR, f);
  if (existsSync(p)) {
    unlinkSync(p);
    console.log(`removed ${p}`);
    removedCount += 1;
  } else {
    console.log(`already absent: ${p}`);
  }
}

for (const f of PRESERVE) {
  const p = join(OP_DIR, f);
  if (existsSync(p)) {
    const { size } = statSync(p);
    console.log(`preserved ${p} (${size} bytes — user settings)`);
  } else {
    console.log(`note: ${p} not present (no settings to preserve)`);
  }
}

console.log(
  `\ndetach complete — ${removedCount} dev artifact(s) removed from Agent-Vault.`,
);
printBratInstructions();

function printBratInstructions() {
  console.log(
    [
      "",
      "Next: install op-obsidian into Agent-Vault via BRAT.",
      "  1. Cut a GitHub release of op-obsidian (separate workflow — see CLAUDE.md).",
      "     The release MUST attach `main.js` and `manifest.json` as assets.",
      "  2. In Agent-Vault: Settings → BRAT → Add Beta plugin.",
      "  3. Paste the GitHub repo URL (e.g. https://github.com/earchibald/obsidian-projects).",
      "  4. BRAT installs from the latest release; existing data.json is reused.",
      "",
      "From here on, dev iteration syncs into OP-Test only:",
      "  node scripts/bump-version.mjs <bump>   # build",
      "  node scripts/dev-sync.mjs              # sync to OP-Test",
      "",
    ].join("\n"),
  );
}
