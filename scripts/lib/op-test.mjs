// Shared helpers for OP-Test test-vault scripts (OP-147).
//
// Single source of truth for:
//   - the OP-Test vault path (no env-var override)
//   - the active-vault assertion against the running Obsidian window
//   - thin wrappers around `obsidian` CLI and `git` so error reporting stays
//     consistent across dev-sync / build-seeds / reset-test-vault.

import { realpathSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join, sep } from "node:path";

export const OP_TEST_VAULT = join(homedir(), "Documents/OP-Test/OP-Test");
export const OP_TEST_PLUGIN_DEST = join(
  OP_TEST_VAULT,
  ".obsidian/plugins/op-obsidian",
);

export function fail(msg) {
  console.error(msg);
  process.exit(1);
}

// Resolve a filesystem path through realpath if it exists; otherwise return
// the input unchanged. Also strips any trailing path separator so that
// "/a/b/" and "/a/b" compare equal (guards against `obsidian vault` emitting
// a trailing slash on some CLI versions).
export function resolvePath(p) {
  let resolved;
  try {
    resolved = realpathSync(p);
  } catch {
    resolved = p;
  }
  // Strip trailing separator(s). realpathSync normalises on most platforms but
  // raw CLI-returned paths may not have been through it.
  while (resolved.length > 1 && resolved.endsWith(sep)) {
    resolved = resolved.slice(0, -1);
  }
  return resolved;
}

// `obsidian vault` prints a tab-separated key/value table:
//   name<TAB>Agent-Vault
//   path<TAB>/Users/.../Agent-Vault
// Returns { name, path } or throws if the CLI is missing or returns no path.
export function readActiveVault() {
  const r = spawnSync("obsidian", ["vault"], { encoding: "utf8" });
  if (r.error) {
    fail(`obsidian CLI not found on PATH (${r.error.message}). Install obsidian-cli first.`);
  }
  if (r.status !== 0) {
    fail(
      `\`obsidian vault\` failed (exit ${r.status}). Is the Obsidian app running with a vault open?\n${r.stderr || r.stdout}`,
    );
  }
  const lines = r.stdout.split("\n").filter(Boolean);
  const fields = {};
  for (const line of lines) {
    const idx = line.indexOf("\t");
    if (idx === -1) continue;
    fields[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  if (!fields.path) {
    fail(`\`obsidian vault\` returned no path field. Raw output:\n${r.stdout}`);
  }
  return { name: fields.name ?? "", path: fields.path };
}

// Refuse to proceed unless the active Obsidian window is OP-Test.
// Resolves both sides through realpath so symlinked vault dirs still match.
export function assertActiveVaultIsOpTest() {
  if (!existsSync(OP_TEST_VAULT)) {
    fail(
      `OP-Test vault is missing at ${OP_TEST_VAULT}.\n` +
        `Create the directory and run \`git init\` inside it before re-running.`,
    );
  }
  const expected = resolvePath(OP_TEST_VAULT);
  const active = readActiveVault();
  const actual = resolvePath(active.path);
  if (actual !== expected) {
    fail(
      `Active Obsidian vault is not OP-Test.\n` +
        `  expected: ${expected}\n` +
        `  active:   ${actual} (${active.name || "unnamed"})\n\n` +
        `Activate the OP-Test window in Obsidian and re-run (these scripts call \`obsidian plugin:reload\` internally without \`vault=OP-Test\`, so they still require the OP-Test window to be focused).`,
    );
  }
  return { vaultPath: actual, vaultName: active.name };
}

// Belt-and-suspenders: refuse any path whose resolved form has "Agent-Vault"
// as a distinct path segment. A substring match would accidentally block
// legitimately-named paths such as ~/old-Agent-Vault-archive/. Conversely,
// a renamed Agent-Vault wouldn't be caught here — the active-vault assertion
// is the primary guard; this one only catches muscle-memory copy-paste errors
// that wire a different target path.
export function assertNotAgentVault(targetPath) {
  const resolved = resolvePath(targetPath);
  const parts = resolved.split(sep);
  if (parts.includes("Agent-Vault")) {
    fail(
      `Refusing to write into a path containing an "Agent-Vault" path segment: ${resolved}\n` +
        `Agent-Vault is a BRAT customer of op-obsidian. Dev syncs target OP-Test only.`,
    );
  }
}

export function runObsidian(args, { allowFail = false } = {}) {
  const r = spawnSync("obsidian", args, { encoding: "utf8" });
  if (r.error) fail(`obsidian CLI not found: ${r.error.message}`);
  if (r.status !== 0 && !allowFail) {
    fail(
      `\`obsidian ${args.join(" ")}\` failed (exit ${r.status})\n` +
        `${r.stderr || ""}\n${r.stdout || ""}`.trim(),
    );
  }
  return r;
}

export function runGit(args, { cwd = OP_TEST_VAULT, allowFail = false } = {}) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (r.error) fail(`git not found: ${r.error.message}`);
  if (r.status !== 0 && !allowFail) {
    fail(
      `\`git ${args.join(" ")}\` failed in ${cwd} (exit ${r.status})\n` +
        `${r.stderr || ""}\n${r.stdout || ""}`.trim(),
    );
  }
  return r;
}
