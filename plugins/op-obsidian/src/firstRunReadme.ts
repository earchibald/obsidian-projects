/**
 * First-run README onboarding (OP-161 / §10 of OP-149).
 *
 * On the first plugin load, we drop a single dismissible markdown file
 * into the user's vault explaining what op is, listing the default
 * hotkey preset, and offering an in-line "Apply preset" / "Start tour"
 * pair of chips. The README is the tour — no modals, no forced
 * walkthrough. Once we've written it, we flip `firstRunCompleted` so a
 * manual delete (the "dismiss" gesture) is durable across reloads.
 *
 * The chips on the README are rendered by the `op-action` codeblock
 * post-processor in `noteDecorations.ts`. Their backing commands
 * (`op-apply-preset`, `op-start-tour`, `op-remove-demo`) are registered
 * by `main.ts`.
 */

import type { App } from "obsidian";
import { normalizePath } from "obsidian";
import {
  DEFAULT_PROJECTS_ROOT,
  currentProjectsRoot,
  demoProjectFolderPath,
  onboardingReadmePath,
} from "./projectPaths";

export const README_PATH = onboardingReadmePath();
export const DEMO_PROJECT_SLUG = "op-demo";
export const DEMO_PROJECT_PREFIX = "DEMO";
export const DEMO_PROJECT_FOLDER = demoProjectFolderPath();

/**
 * Pure markdown body for the first-run README. Kept pure so tests can
 * assert the chip codeblocks are present without spinning up an
 * Obsidian app instance.
 */
export function buildReadmeBody(projectsRoot = DEFAULT_PROJECTS_ROOT): string {
  return [
    "# Welcome to op",
    "",
    "Obsidian Projects (op) is a tiny issue tracker that lives in this vault.",
    `Issues are markdown notes under \`${projectsRoot}/<slug>/ISSUES/\`; commands sit`,
    "under `op:` in the command palette; agents launch into tmux. Dismiss",
    "this README by deleting it — it won't come back.",
    "",
    "## Default hotkey preset",
    "",
    "| Action | Hotkey |",
    "| --- | --- |",
    "| Open sidebar | ⌘⇧O |",
    "| Pick & act | ⌘⇧I |",
    "| Resume last | ⌘⇧↵ |",
    "| Attach current | ⌘⇧A |",
    "| Open agent | ⌘⇧L |",
    "| Resolve | ⌘⇧R |",
    "| New issue | ⌘⌥N |",
    "| Append commit | ⌘⇧. |",
    "| Next / previous issue | ⌘⇧J / ⌘⇧K |",
    "",
    "```op-action",
    "action: op-apply-preset",
    "label: Apply preset",
    "```",
    "",
    "## Try it on a demo project",
    "",
    "Spin up a throwaway `op-demo` project (prefix `DEMO`) with three pre-seeded",
    "issues so you can practice `/op:resolve` against real data:",
    "",
    "```op-action",
    "action: op-start-tour",
    "label: Start tour",
    "```",
    "",
    "Tear it down again from the demo project's `STATUS.md` whenever you're done.",
    "",
    "## Workflow modules",
    "",
    "op composes the prompt your agents receive out of small markdown",
    `modules under \`${projectsRoot}/_op-modules/\` (global) and`,
    `\`${projectsRoot}/<slug>/MODULES/\` (per-project). Read the docs to see how`,
    "the precedence chain fits together and how to author your first",
    "module:",
    "",
    "- [Conceptual overview](https://github.com/earchibald/obsidian-projects/blob/main/docs/workflow-modules/01-overview.md)",
    "- [5-minute quickstart](https://github.com/earchibald/obsidian-projects/blob/main/docs/workflow-modules/02-quickstart.md)",
    "",
    "---",
    "",
    "More: [github.com/earchibald/obsidian-projects](https://github.com/earchibald/obsidian-projects)",
    "",
  ].join("\n");
}

/** Markdown body for the demo project's STATUS.md. Includes the
 * Remove-demo chip per OP-161's "demo-project teardown" requirement. */
export function buildDemoStatusBody(): string {
  return [
    "# op-demo — practice project",
    "",
    "Three pre-seeded issues live in `ISSUES/`. Practice the resolve flow",
    "(`/op:resolve` or the sidebar's `r` shortcut) against `DEMO-1`/`DEMO-2`/",
    "`DEMO-3` — they have no real-world consequence.",
    "",
    "When you're done, tear the whole project down with one click:",
    "",
    "```op-action",
    "action: op-remove-demo",
    "label: Remove demo project",
    "```",
    "",
  ].join("\n");
}

/** Frontmatter for the demo STATUS.md note. OP-265: `vault:` records the
 *  active vault name at scaffold time so launched agents can derive the
 *  `vault=<name>` CLI selector from STATUS.md without re-probing. */
export function demoStatusFrontmatter(vault: string): string {
  return [
    "---",
    "project: " + DEMO_PROJECT_SLUG,
    "type: project-status",
    "prefix: " + DEMO_PROJECT_PREFIX,
    "vault: " + vault,
    "tags:",
    "  - project/" + DEMO_PROJECT_SLUG,
    "  - status",
    "---",
    "",
  ].join("\n");
}

export function demoBaseBody(): string {
  // Minimal Bases file — same shape as scaffoldProject.ts uses for new
  // projects. We don't need formulas here, just a tabular view.
  return [
    "filters:",
    "  and:",
    `    - file.folder.contains("${DEMO_PROJECT_SLUG}")`,
    "views:",
    "  - type: table",
    "    name: All issues",
    "",
  ].join("\n");
}

export interface DemoIssueSeed {
  number: number;
  title: string;
  body: string;
}

export const DEMO_ISSUES: ReadonlyArray<DemoIssueSeed> = [
  {
    number: 1,
    title: "Try the resolve flow",
    body: [
      "## Scope",
      "",
      "- [ ] Run the command palette (⌘P) and search for `op: resolve`.",
      "- [ ] Confirm the modal — the file moves to `RESOLVED ISSUES/`.",
      "- [ ] Notice the chip above the H1 flips to `↺ Reopen` afterwards.",
      "",
    ].join("\n"),
  },
  {
    number: 2,
    title: "Try launching an agent",
    body: [
      "## Scope",
      "",
      "- [ ] Hit ⌘⇧L on this note (after applying the preset).",
      "- [ ] An agent opens in a new iTerm tab; the sidebar grows a badge.",
      "- [ ] Detach with ⌘⇧A or via the chip's overflow menu.",
      "",
    ].join("\n"),
  },
  {
    number: 3,
    title: "Try the sidebar",
    body: [
      "## Scope",
      "",
      "- [ ] Open the op sidebar (⌘⇧O).",
      "- [ ] Use ↑ ↓ to move; ↵ to open; `r` to resolve under the cursor.",
      "- [ ] Right-click any row for the context menu.",
      "",
    ].join("\n"),
  },
] as const;

/** Compose the full markdown for one demo issue note. */
export function buildDemoIssueNote(seed: DemoIssueSeed): string {
  const id = `${DEMO_PROJECT_PREFIX}-${seed.number}`;
  return [
    "---",
    `id: ${id}`,
    `project: ${DEMO_PROJECT_SLUG}`,
    `title: ${seed.title}`,
    "type: issue",
    "status: open",
    "priority: med",
    "tags:",
    `  - project/${DEMO_PROJECT_SLUG}`,
    "  - issue",
    "---",
    `# ${seed.title}`,
    "",
    seed.body,
  ].join("\n");
}

/**
 * Settings shape consumed by the first-run hook. Kept narrow so the
 * pure decision is unit-testable without `OpSettings`.
 */
export interface FirstRunSettings {
  firstRunCompleted: boolean;
  projectsRoot?: string;
}

/** Pure decision: should we scaffold the README on this load? */
export function shouldScaffoldReadme(
  settings: FirstRunSettings,
  readmeExists: boolean,
): boolean {
  if (settings.firstRunCompleted) return false;
  if (readmeExists) return false;
  return true;
}

export interface ReadmeWriter {
  /** Resolve a TFile by path, or `null` if missing. */
  exists: (path: string) => boolean;
  /** Write a fresh file at `path` (creates parent folders if needed). */
  write: (path: string, content: string) => Promise<void>;
}

/**
 * If `firstRunCompleted` is false and the README is absent, write the
 * README and flip the flag. Idempotent — a second call is a no-op.
 */
export async function scaffoldFirstRunReadme(
  settings: FirstRunSettings,
  writer: ReadmeWriter,
  saveSettings: () => Promise<void>,
): Promise<{ scaffolded: boolean; readmePath: string }> {
  const path = onboardingReadmePath(settings.projectsRoot);
  if (!shouldScaffoldReadme(settings, writer.exists(path))) {
    return { scaffolded: false, readmePath: path };
  }
  await writer.write(path, buildReadmeBody(settings.projectsRoot));
  settings.firstRunCompleted = true;
  await saveSettings();
  return { scaffolded: true, readmePath: path };
}

/**
 * Apply a {@link ReadmeWriter} to the live Obsidian vault. Pulled out
 * so tests can substitute a fake writer without touching the disk.
 */
export function liveReadmeWriter(app: App): ReadmeWriter {
  return {
    exists: (path) => !!app.vault.getAbstractFileByPath(normalizePath(path)),
    write: async (path, content) => {
      const norm = normalizePath(path);
      const dirIdx = norm.lastIndexOf("/");
      if (dirIdx > 0) {
        const dir = norm.slice(0, dirIdx);
        const folder = app.vault.getAbstractFileByPath(dir);
        if (!folder) await app.vault.createFolder(dir);
      }
      await app.vault.create(norm, content);
    },
  };
}

/**
 * Scaffold the demo project (`Projects/op-demo/`) — STATUS.md, base file,
 * and three pre-seeded issues. Idempotent on `Projects/op-demo/STATUS.md`:
 * if it already exists we skip everything (the user can clear via the
 * Remove-demo chip and re-run).
 */
export async function scaffoldDemoProject(app: App): Promise<{
  created: boolean;
  statusPath: string;
}> {
  const demoFolder = demoProjectFolderPath(currentProjectsRoot(app));
  const statusPath = `${demoFolder}/STATUS.md`;
  if (app.vault.getAbstractFileByPath(statusPath)) {
    return { created: false, statusPath };
  }
  const issuesDir = `${demoFolder}/ISSUES`;
  await ensureFolder(app, demoFolder);
  await ensureFolder(app, issuesDir);
  await app.vault.create(statusPath, demoStatusFrontmatter(app.vault.getName()) + buildDemoStatusBody());
  await app.vault.create(`${demoFolder}/${DEMO_PROJECT_SLUG}.base`, demoBaseBody());
  for (const seed of DEMO_ISSUES) {
    const filename = `${DEMO_PROJECT_PREFIX}-${seed.number} ${seed.title}.md`;
    await app.vault.create(`${issuesDir}/${filename}`, buildDemoIssueNote(seed));
  }
  return { created: true, statusPath };
}

async function ensureFolder(app: App, path: string): Promise<void> {
  const norm = normalizePath(path);
  if (!app.vault.getAbstractFileByPath(norm)) {
    await app.vault.createFolder(norm);
  }
}

/**
 * Trash the entire demo project folder. Returns whether the folder was
 * found — caller surfaces a Notice so the user knows the click did
 * something even if they'd already deleted it.
 */
export async function removeDemoProject(
  app: App,
): Promise<{ removed: boolean; folder: string }> {
  const demoFolder = demoProjectFolderPath(currentProjectsRoot(app));
  const folder = app.vault.getAbstractFileByPath(demoFolder);
  if (!folder) return { removed: false, folder: demoFolder };
  await app.vault.trash(folder, true);
  return { removed: true, folder: demoFolder };
}

/** Public for tests + the codeblock chip parser. */
export interface OpAction {
  action: string;
  label: string;
}

/** Parse the body of an `op-action` codeblock. The format is a
 * line-per-key YAML-ish shape: `action: <id>` and `label: <text>`. We
 * avoid pulling in a YAML parser for two keys. Returns `null` when the
 * body is malformed so the renderer can show an inline error instead. */
export function parseOpActionBlock(body: string): OpAction | null {
  let action = "";
  let label = "";
  for (const lineRaw of body.split(/\r?\n/)) {
    const line = lineRaw.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (key === "action") action = val;
    else if (key === "label") label = val;
  }
  if (!action || !label) return null;
  return { action, label };
}
