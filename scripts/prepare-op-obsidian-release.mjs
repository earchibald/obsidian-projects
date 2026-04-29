#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const pluginDir = join(root, "plugins/op-obsidian");
const releaseDir = join(pluginDir, ".release");
const bundleDir = join(releaseDir, "op-obsidian");
const bundleZip = join(releaseDir, "op-obsidian.zip");

const bundleAssets = [
  "main.js",
  "manifest.json",
  "styles.css",
  "dashboard/op-dashboard.py",
  "dashboard/client/index.html",
];

for (const relPath of bundleAssets) {
  const absPath = join(pluginDir, relPath);
  if (!existsSync(absPath)) {
    console.error(`prepare-op-obsidian-release: missing required asset ${relative(root, absPath)}`);
    process.exit(1);
  }
  if (!statSync(absPath).isFile()) {
    console.error(`prepare-op-obsidian-release: expected file, found non-file at ${relative(root, absPath)}`);
    process.exit(1);
  }
}

rmSync(releaseDir, { recursive: true, force: true });
mkdirSync(bundleDir, { recursive: true });

for (const relPath of bundleAssets) {
  const destPath = join(bundleDir, relPath);
  mkdirSync(dirname(destPath), { recursive: true });
  cpSync(join(pluginDir, relPath), destPath);
}

const zip = spawnSync("zip", ["-qr", bundleZip, "op-obsidian"], {
  cwd: releaseDir,
  stdio: "inherit",
});
if (zip.status !== 0) {
  process.exit(zip.status ?? 1);
}

const list = spawnSync(
  "python3",
  [
    "-c",
    "import sys, zipfile\nwith zipfile.ZipFile(sys.argv[1]) as zf:\n    print('\\n'.join(zf.namelist()))\n",
    bundleZip,
  ],
  {
    cwd: releaseDir,
    encoding: "utf8",
  },
);
if (list.status !== 0) {
  process.stderr.write(list.stderr ?? "");
  process.exit(list.status ?? 1);
}

const zipEntries = new Set(
  list.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean),
);

for (const relPath of bundleAssets) {
  const zipPath = `op-obsidian/${relPath}`;
  if (!zipEntries.has(zipPath)) {
    console.error(`prepare-op-obsidian-release: bundle zip is missing ${zipPath}`);
    process.exit(1);
  }
}

console.log(`prepare-op-obsidian-release: wrote ${relative(root, bundleZip)}`);
for (const relPath of bundleAssets) {
  console.log(`  - ${relPath}`);
}
