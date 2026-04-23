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

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const targets = [
  join(root, "plugins/op-obsidian/manifest.json"),
  join(root, "plugins/op-obsidian/package.json"),
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
