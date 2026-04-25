#!/usr/bin/env node
// Bump every version surface in the monorepo in lockstep:
//   - plugins/op-obsidian/manifest.json
//   - plugins/op-obsidian/package.json
//   - plugins/op/.claude-plugin/plugin.json
//
// Usage:
//   node scripts/bump-version.mjs patch|minor|major
//   node scripts/bump-version.mjs <explicit-version>
//   ./scripts/bump-version.mjs patch   (executable hashbang)
//
// When npm invokes this via `npm version` it sets `npm_package_version` to the
// already-bumped package.json — we detect that and mirror it to the other files.

import { readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const pluginDir = join(root, "plugins/op-obsidian");
const manifestPath = join(pluginDir, "manifest.json");
const mainJsPath = join(pluginDir, "main.js");

const targets = [
  manifestPath,
  join(pluginDir, "package.json"),
  join(root, "plugins/op/.claude-plugin/plugin.json"),
];

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function readJSON(p) {
  let raw;
  try {
    raw = readFileSync(p, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") {
      console.error(`bump-version: missing target file ${relative(root, p)} (expected at ${p})`);
      process.exit(1);
    }
    throw err;
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error(`bump-version: ${relative(root, p)} is not valid JSON: ${err.message}`);
    process.exit(1);
  }
}

function writeJSON(p, obj) {
  writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
}

function bump(current, kind) {
  if (!SEMVER.test(current)) {
    throw new Error(`current version ${JSON.stringify(current)} is not strict semver (x.y.z)`);
  }
  const [maj, min, pat] = current.split(".").map(Number);
  if (kind === "major") return `${maj + 1}.0.0`;
  if (kind === "minor") return `${maj}.${min + 1}.0`;
  if (kind === "patch") return `${maj}.${min}.${pat + 1}`;
  if (SEMVER.test(kind)) return kind;
  throw new Error(`Unrecognised bump kind: ${kind} (expected patch|minor|major or x.y.z)`);
}

const arg = process.env.npm_package_version ?? process.argv[2];
if (!arg) {
  console.error("usage: bump-version.mjs <patch|minor|major|x.y.z>");
  process.exit(1);
}

const manifest = readJSON(targets[0]);
const next = process.env.npm_package_version ?? bump(manifest.version, arg);

for (const path of targets) {
  const obj = readJSON(path);
  obj.version = next;
  writeJSON(path, obj);
  console.log(`${path} → ${next}`);
}

// Freshness gate (OP-105): rebuild plugins/op-obsidian/main.js and assert its
// mtime is at or after the manifest we just wrote. Catches the OP-98 footgun
// where main.js is gitignored and a hand-bumped manifest shipped with a stale
// bundle.
if (!existsSync(join(pluginDir, "node_modules"))) {
  console.error(
    `bump-version: ${relative(root, pluginDir)}/node_modules is missing — run \`npm ci\` (or \`npm install\`) in ${relative(root, pluginDir)} before bumping.`,
  );
  process.exit(1);
}

console.log(`bump-version: building ${relative(root, pluginDir)}/main.js …`);
const build = spawnSync("npm", ["run", "build"], {
  cwd: pluginDir,
  stdio: "inherit",
});

if (build.status !== 0) {
  console.error(
    `bump-version: \`npm run build\` failed in ${relative(root, pluginDir)} (exit ${build.status}). Version files were bumped to ${next} — fix the source and re-run \`node scripts/bump-version.mjs ${next}\`.`,
  );
  process.exit(build.status ?? 1);
}

if (!existsSync(mainJsPath)) {
  console.error(
    `bump-version: build returned 0 but ${relative(root, mainJsPath)} is missing — esbuild config likely broken.`,
  );
  process.exit(1);
}

const mainMtime = statSync(mainJsPath).mtimeMs;
const manifestMtime = statSync(manifestPath).mtimeMs;
if (mainMtime < manifestMtime) {
  console.error(
    `bump-version: ${relative(root, mainJsPath)} mtime (${new Date(mainMtime).toISOString()}) is older than ${relative(root, manifestPath)} (${new Date(manifestMtime).toISOString()}). Build did not refresh the bundle.`,
  );
  process.exit(1);
}

console.log(`bump-version: ${relative(root, mainJsPath)} rebuilt and fresher than manifest — OK.`);
