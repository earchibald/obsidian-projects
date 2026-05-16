// Shared helpers for OP-Test test-vault scripts (OP-147, OP-175, OP-278).
//
// Single source of truth for:
//   - the OP-Test vault path (resolved once at module load — see
//     `resolveOpTestVault`: OP_TEST_VAULT env override > Obsidian-reported
//     basePath > legacy ~/Documents/OP-Test/OP-Test default)
//   - the OP-Test-open assertion (vault registered + reachable, not necessarily focused)
//   - thin wrappers around `obsidian` CLI and `git` so error reporting stays
//     consistent across dev-sync / build-seeds / reset-test-vault.
//
// All `obsidian` CLI calls go through `runObsidian`, which prepends
// `vault=OP-Test` so routing is explicit per-call (OP-171/OP-175). This means
// no script in this directory cares which Obsidian window is currently
// focused — it will always hit OP-Test. Callers that need a different vault
// should use spawnSync directly.

import { existsSync, realpathSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join, sep } from "node:path";

export const OP_TEST_VAULT_NAME = "OP-Test";

// Historical hardcoded location, kept as the final fallback so behavior is
// unchanged when Obsidian is unreachable (the assertion below then surfaces
// the proper "open OP-Test" error rather than crashing at import).
const LEGACY_OP_TEST_VAULT = join(homedir(), "Documents/OP-Test/OP-Test");

// Strip the obsidian-cli `=> ` reply prefix and any wrapping quotes.
function parseEvalString(stdout) {
  let s = (stdout || "").trim();
  if (s.startsWith("=>")) s = s.slice(2).trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1);
  }
  return s;
}

// Resolve the OP-Test vault path once at module load. Consumers import
// OP_TEST_VAULT as a const and read it at import time (e.g.
// `const SCRATCH = join(OP_TEST_VAULT, …)`), so resolution must be eager and
// synchronous. Precedence (OP-278):
//   1. OP_TEST_VAULT env var          — explicit override, highest precedence
//   2. Obsidian-reported basePath     — auto-tracks vault moves; the scripts
//                                        require OP-Test open anyway, so the
//                                        probe is free
//   3. legacy ~/Documents/OP-Test/…   — final fallback (Obsidian unreachable)
function resolveOpTestVault() {
  const env = process.env.OP_TEST_VAULT?.trim();
  if (env) return env;

  try {
    const r = spawnSync(
      "obsidian",
      [
        `vault=${OP_TEST_VAULT_NAME}`,
        "eval",
        "code=app.vault.adapter.basePath",
      ],
      { encoding: "utf8" },
    );
    const stdout = (r.stdout || "").trim();
    if (
      !r.error &&
      r.status === 0 &&
      !/vault not found/i.test(stdout)
    ) {
      const p = parseEvalString(stdout);
      if (p && p.startsWith("/")) return p;
    }
  } catch {
    /* fall through to the legacy default */
  }

  return LEGACY_OP_TEST_VAULT;
}

export const OP_TEST_VAULT = resolveOpTestVault();
export const OP_TEST_PLUGIN_DEST = join(
  OP_TEST_VAULT,
  ".obsidian/plugins/op-obsidian",
);

export function fail(msg) {
  console.error(msg);
  process.exit(1);
}

// Refuse to proceed unless the OP-Test vault is registered with the running
// Obsidian app and reachable via `vault=OP-Test`. Does NOT require OP-Test to
// be the focused window — `runObsidian` routes every call explicitly.
//
// Probe: `obsidian vault=OP-Test eval code='app.vault.getName()'`. The CLI
// returns exit 0 in both the hit and miss cases on the versions we ship
// against, so we parse stdout instead of trusting the exit code:
//   hit  → stdout starts with "=> OP-Test"
//   miss → stdout is "Vault not found."
export function assertOpTestVaultOpen() {
  if (!existsSync(OP_TEST_VAULT)) {
    fail(
      `OP-Test vault is missing at ${OP_TEST_VAULT}.\n` +
        `Create the directory and run \`git init\` inside it, or point at the\n` +
        `real location with \`OP_TEST_VAULT=/abs/path …\` before re-running.`,
    );
  }
  const r = spawnSync(
    "obsidian",
    [`vault=${OP_TEST_VAULT_NAME}`, "eval", "code=app.vault.getName()"],
    { encoding: "utf8" },
  );
  if (r.error) {
    fail(`obsidian CLI not found on PATH (${r.error.message}). Install obsidian-cli first.`);
  }
  const stdout = (r.stdout || "").trim();
  const stderr = (r.stderr || "").trim();
  if (r.status !== 0 || /vault not found/i.test(stdout)) {
    fail(
      `OP-Test vault is not open in Obsidian.\n` +
        `  probe: obsidian vault=${OP_TEST_VAULT_NAME} eval code='app.vault.getName()'\n` +
        `  exit:  ${r.status}\n` +
        `  out:   ${stdout || "(empty)"}\n` +
        (stderr ? `  err:   ${stderr}\n` : "") +
        `\nOpen the OP-Test vault in Obsidian (any window — focus is no longer required) and re-run.`,
    );
  }
  if (!stdout.startsWith(`=> ${OP_TEST_VAULT_NAME}`)) {
    fail(
      `OP-Test probe returned an unexpected payload — refusing to proceed.\n` +
        `  out: ${stdout || "(empty)"}\n`,
    );
  }
  return { vaultName: OP_TEST_VAULT_NAME, vaultPath: OP_TEST_VAULT };
}

// Resolve through realpath if the path exists; strip trailing separator. Used
// only by `assertNotAgentVault` so the path-segment check sees the canonical
// form even when the caller passed a symlinked or trailing-slashed path.
function resolvePath(p) {
  let resolved;
  try {
    resolved = realpathSync(p);
  } catch {
    resolved = p;
  }
  while (resolved.length > 1 && resolved.endsWith(sep)) {
    resolved = resolved.slice(0, -1);
  }
  return resolved;
}

// Belt-and-suspenders: refuse any path whose resolved form has "Agent-Vault"
// as a distinct path segment. A substring match would accidentally block
// legitimately-named paths such as ~/old-Agent-Vault-archive/. Conversely,
// a renamed Agent-Vault wouldn't be caught here — the OP-Test-open assertion
// + the explicit `vault=OP-Test` routing are the primary guards; this one
// catches muscle-memory copy-paste errors that wire a different target path.
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

// Run the `obsidian` CLI with `vault=OP-Test` prepended so the call is
// routed at OP-Test regardless of which Obsidian window is currently focused
// (OP-175). All scripts in this directory exclusively target OP-Test, so the
// prepend is unconditional. If a future caller needs a different vault, use
// spawnSync directly rather than threading an opt-out through here.
export function runObsidian(args, { allowFail = false } = {}) {
  const fullArgs = [`vault=${OP_TEST_VAULT_NAME}`, ...args];
  const r = spawnSync("obsidian", fullArgs, { encoding: "utf8" });
  if (r.error) fail(`obsidian CLI not found: ${r.error.message}`);
  if (r.status !== 0 && !allowFail) {
    fail(
      `\`obsidian ${fullArgs.join(" ")}\` failed (exit ${r.status})\n` +
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
