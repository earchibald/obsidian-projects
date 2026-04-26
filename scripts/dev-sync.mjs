#!/usr/bin/env node
// Sync the locally-built op-obsidian artifact into the OP-Test vault and
// reload the plugin. Replaces the manual cp + reload dance documented in
// CLAUDE.md (OP-147).
//
// Usage:
//   node scripts/bump-version.mjs <bump>   # build first
//   node scripts/dev-sync.mjs              # then sync into OP-Test
//
// Hardcoded target: ~/Documents/OP-Test/OP-Test/.obsidian/plugins/op-obsidian/
// No env-var override — Agent-Vault is BRAT-only and must never receive a
// dev sync. The OP-Test-open assertion + the Agent-Vault path-segment guard
// + explicit `vault=OP-Test` routing on every CLI call (OP-175) jointly
// enforce this; no Obsidian window needs to be focused on OP-Test.

import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import {
  OP_TEST_PLUGIN_DEST,
  assertNotAgentVault,
  assertOpTestVaultOpen,
  fail,
  runObsidian,
} from "./lib/op-test.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const pluginSrc = join(root, "plugins/op-obsidian");
const filesToCopy = ["main.js", "manifest.json"];

assertOpTestVaultOpen();
assertNotAgentVault(OP_TEST_PLUGIN_DEST);

for (const f of filesToCopy) {
  const src = join(pluginSrc, f);
  if (!existsSync(src)) {
    fail(
      `Source artifact missing: ${relative(root, src)}\n` +
        `Run \`node scripts/bump-version.mjs <patch|minor|major>\` first to build.`,
    );
  }
}

mkdirSync(OP_TEST_PLUGIN_DEST, { recursive: true });

for (const f of filesToCopy) {
  const src = join(pluginSrc, f);
  const dest = join(OP_TEST_PLUGIN_DEST, f);
  copyFileSync(src, dest);
  const { size } = statSync(dest);
  console.log(`copied ${f} (${size} bytes) → ${dest}`);
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
