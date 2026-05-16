#!/usr/bin/env node
// Sync the locally-built op-obsidian artifact into the OP-Test vault and
// reload the plugin. Replaces the manual cp + reload dance documented in
// CLAUDE.md (OP-147).
//
// Usage:
//   node scripts/bump-version.mjs <bump>   # build first
//   node scripts/dev-sync.mjs              # then sync into OP-Test
//
// Target: <OP-Test-vault>/.obsidian/plugins/op-obsidian/, where the vault
// path is resolved by scripts/lib/op-test.mjs (OP_TEST_VAULT env override >
// Obsidian-reported basePath > legacy ~/Documents/OP-Test default — OP-278).
// Agent-Vault is BRAT-only and must never receive a dev sync. The
// OP-Test-open assertion + the Agent-Vault path-segment guard + explicit
// `vault=OP-Test` routing on every CLI call (OP-175) jointly enforce this;
// no Obsidian window needs to be focused on OP-Test.

import {
  assertOpTestVaultOpen,
  fail,
  runObsidian,
  syncBuiltPlugin,
} from "./lib/op-test.mjs";

assertOpTestVaultOpen();

// syncBuiltPlugin() owns the Agent-Vault guard, the unbuilt-artifact check,
// and the copy itself (single source of truth, shared with reset-test-vault.mjs
// and build-seeds.mjs).
for (const c of syncBuiltPlugin()) {
  console.log(`copied ${c.file} (${c.bytes} bytes) → ${c.dest}`);
}

// Try the fast path first; fall back to load-manifests + enable for the
// first-install case (Obsidian hasn't scanned the new folder yet).
const reload = runObsidian(["plugin:reload", "id=op-obsidian"], { allowFail: true });
if (reload.status === 0) {
  console.log("plugin reloaded (op-obsidian)");
  process.exit(0);
}

const reloadDiag = (reload.stderr || reload.stdout || "").trim();
console.log(
  `plugin:reload returned non-zero (exit ${reload.status})${reloadDiag ? `:\n  ${reloadDiag}` : ""}\n` +
    `Running first-install fallback (loadManifests + enablePluginAndSave).` +
    ` If this is not a first-install, check Obsidian logs for the underlying cause.`,
);
const firstInstall = runObsidian([
  "eval",
  'code=(async()=>{await app.plugins.loadManifests(); await app.plugins.enablePluginAndSave("op-obsidian"); return {enabled: app.plugins.enabledPlugins.has("op-obsidian"), version: app.plugins.plugins["op-obsidian"]?.manifest?.version}})()',
]);

console.log(firstInstall.stdout.trim());
if (!firstInstall.stdout.includes('"enabled": true')) {
  fail(
    "First-install fallback did not enable op-obsidian. Check Obsidian's community-plugin settings (must be enabled) and re-run.",
  );
}
