import { describe, it, expect, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { parse as parseYaml } from "yaml";

vi.mock("obsidian", () => {
  // Minimal Obsidian shims used by the IO seams under test:
  //   - `TFile` is consumed via `instanceof` checks and field access
  //     (`path`, `basename`, `name`).
  //   - `App` and `normalizePath` are imported by `workflowFile.ts`; only
  //     `normalizePath` has runtime behavior — we mirror Obsidian's
  //     "collapse multiple slashes, drop leading `./`" pass.
  class TFile {
    path = "";
    basename = "";
    name = "";
  }
  class App {}
  return {
    TFile,
    App,
    normalizePath: (p: string) => p.replace(/\/+/g, "/").replace(/^\.\//, ""),
  };
});

import { TFile } from "obsidian";
import {
  loadModuleSources,
  type ModuleSourceBundle,
} from "./composeWorkflow";
import {
  composeWorkflow,
  type ComposeContext,
  DEFAULT_MAX_WORKFLOW_CHARS,
} from "./composeWorkflowPure";
import type { WorkflowDiagnostic } from "./workflowDiagnostic";

// --------------------------------------------------------------------------
// Examples manifest
//
// Every entry here corresponds to one subtree under `docs/examples/`. Each
// subtree is a self-contained "vault root" — paths inside it line up with
// where the loader expects to find files in a real vault.
//
// Spec (OP-212): each example file in docs/examples/ parses cleanly via the
// loader (1b/1c) and composes cleanly via composeWorkflow (1d) — zero
// diagnostics. We assert against ERROR-severity diagnostics specifically;
// warning + info severities are tolerated when they reflect intentional
// choices (e.g., a bare var with a project-supplied value would emit no
// `missing-var` because the value resolves — but a future tutorial example
// might surface an info-level "declared-but-unused" that's pedagogically
// useful to keep).
//
// To add a new example:
//   1. Drop the vault-shaped tree under `docs/examples/<example-name>/`.
//   2. Add an entry below describing the project slug (or `null` for
//      module-only examples), the steps to compose at, and any user-var
//      values the modules require for clean rendering.
// --------------------------------------------------------------------------

interface ExampleSpec {
  /** Subtree name under `docs/examples/`. */
  name: string;
  /**
   * Project slug to compose for. `null` for module-only examples that don't
   * ship a workflow file — only the module loader runs in that case.
   */
  project: string | null;
  /** Step ids to compose at. Empty for module-only examples. */
  composeAtSteps: string[];
  /**
   * User-var values supplied at the global scope. Useful when an example
   * deliberately ships a bare var (no module default) and expects the
   * project hosting it to supply the value.
   */
  globalVars?: Record<string, string>;
  /** User-var values supplied at the project scope (winning over global). */
  projectVars?: Record<string, string>;
  /** User-var values supplied at the launch scope (winning over project). */
  launchVars?: Record<string, string>;
}

const EXAMPLES: ExampleSpec[] = [
  {
    name: "author-first-module",
    project: null,
    composeAtSteps: [],
  },
  {
    name: "compose-first-workflow",
    project: "tutorial-project",
    composeAtSteps: ["kickoff", "review"],
  },
  {
    name: "variables-and-templating",
    project: "tutorial-project",
    composeAtSteps: ["kickoff"],
    // The `repo-paths` module declares `reviewer_handle` as a bare var
    // (no module default). A real project would set it via STATUS.md
    // `vars:` map (project scope). Mirror that here so composition
    // resolves cleanly.
    projectVars: {
      reviewer_handle: "@earchibald",
    },
  },
];

const EXAMPLES_ROOT = resolve(__dirname, "..", "..", "..", "docs", "examples");

// --------------------------------------------------------------------------
// Filesystem-backed fake App
// --------------------------------------------------------------------------

interface RawFile {
  vaultPath: string;
  fsPath: string;
  raw: string;
  frontmatter: Record<string, unknown> | null;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (entry.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Read every `.md` under `exampleRoot`, parse frontmatter via the `yaml`
 * package, and return the records keyed by vault-relative path. The
 * vault-relative path is the suffix after the example root, with OS-native
 * separators normalized to `/`.
 *
 * Files outside `Projects/` are skipped — the loader ignores them anyway,
 * and the example trees only ship files we want loaded (plus this folder's
 * top-level README.md, which would falsely match `*.md` without the
 * `Projects/` filter).
 */
function readExample(exampleRoot: string): RawFile[] {
  const files: RawFile[] = [];
  for (const fsPath of walk(exampleRoot)) {
    const rel = relative(exampleRoot, fsPath).split(sep).join("/");
    if (!rel.startsWith("Projects/")) continue;
    const raw = readFileSync(fsPath, "utf8");
    let frontmatter: Record<string, unknown> | null = null;
    if (raw.startsWith("---")) {
      const end = raw.indexOf("\n---", 3);
      if (end > 0) {
        const yamlText = raw.slice(3, end + 1).replace(/^\n/, "");
        try {
          const parsed = parseYaml(yamlText);
          frontmatter = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
        } catch (e) {
          throw new Error(`YAML parse failed for ${fsPath}: ${(e as Error).message}`);
        }
      }
    }
    files.push({ vaultPath: rel, fsPath, raw, frontmatter });
  }
  return files;
}

interface FakeApp {
  vault: {
    getMarkdownFiles: () => unknown[];
    read: (file: unknown) => Promise<string>;
    getAbstractFileByPath: (path: string) => unknown;
  };
  metadataCache: {
    getFileCache: (file: unknown) => { frontmatter?: Record<string, unknown> } | null;
  };
}

function makeFakeApp(files: RawFile[]): FakeApp {
  const tfileByPath = new Map<string, TFile>();
  for (const f of files) {
    const tf = new TFile();
    const basename = f.vaultPath.split("/").pop()!.replace(/\.md$/, "");
    Object.assign(tf, {
      path: f.vaultPath,
      basename,
      name: `${basename}.md`,
    });
    tfileByPath.set(f.vaultPath, tf);
  }
  const fileToRaw = new Map<TFile, RawFile>();
  for (const f of files) {
    const tf = tfileByPath.get(f.vaultPath)!;
    fileToRaw.set(tf, f);
  }

  return {
    vault: {
      getMarkdownFiles: () => Array.from(tfileByPath.values()),
      read: async (file: unknown) => {
        const r = fileToRaw.get(file as TFile);
        if (!r) throw new Error(`fake-app: unknown TFile`);
        return r.raw;
      },
      getAbstractFileByPath: (path: string) => tfileByPath.get(path) ?? null,
    },
    metadataCache: {
      getFileCache: (file: unknown) => {
        const r = fileToRaw.get(file as TFile);
        if (!r || r.frontmatter === null) return null;
        return { frontmatter: r.frontmatter };
      },
    },
  };
}

// --------------------------------------------------------------------------
// Diagnostic filter — error severity is the bar
// --------------------------------------------------------------------------

function errors(diags: WorkflowDiagnostic[]): WorkflowDiagnostic[] {
  return diags.filter((d) => d.severity === "error");
}

function format(diags: WorkflowDiagnostic[]): string {
  return diags
    .map((d) => `[${d.code}/${d.severity}] ${d.message}`)
    .join("\n");
}

// --------------------------------------------------------------------------
// Render context — a plausible launch context for compose
// --------------------------------------------------------------------------

function renderCtx(args: { project: string; mode: string }) {
  return {
    id: "TUT-1",
    title: "Tutorial issue",
    project: args.project,
    status: "in-progress",
    priority: "med",
    parent: null, // PARENT_NONE_SENTINEL fires
    pr_url: "https://github.com/example/repo/pull/42",
    github_issue: "https://github.com/example/repo/issues/41",
    repo_path: `/Users/example/Projects/${args.project}`,
    vault_path: "/Users/example/work/Agent-Vault",
    vault_name: "Agent-Vault",
    branch: "worktree-TUT-1",
    today: "2026-04-26",
    agent: "claude",
    model: "claude-opus-4-7",
    mode: args.mode,
  };
}

// --------------------------------------------------------------------------
// Per-example assertion driver
// --------------------------------------------------------------------------

async function assertExampleClean(spec: ExampleSpec) {
  const root = resolve(EXAMPLES_ROOT, spec.name);
  const files = readExample(root);
  expect(files.length).toBeGreaterThan(0); // sanity: example isn't empty
  const app = makeFakeApp(files);

  let bundle: ModuleSourceBundle;
  if (spec.project === null) {
    // Module-only example — no workflow file ships in this subtree, so
    // `loadModuleSources` (which requires a project slug to fetch the
    // workflow file) doesn't apply. Call `loadModules` directly with no
    // project filter; we only need to verify the module file loads cleanly.
    const { loadModules } = await import("./workflowModule");
    const r = loadModules(app as never);
    const errs = errors(r.diagnostics);
    if (errs.length > 0) {
      throw new Error(
        `Example "${spec.name}" produced loader errors:\n${format(errs)}`,
      );
    }
    expect(r.modules.length).toBeGreaterThan(0);
    return;
  }

  bundle = await loadModuleSources(app as never, { project: spec.project });
  const loaderErrs = errors(bundle.diagnostics);
  if (loaderErrs.length > 0) {
    throw new Error(
      `Example "${spec.name}" loader errors:\n${format(loaderErrs)}`,
    );
  }
  expect(bundle.workflow, `Example "${spec.name}" must produce a workflow`).not.toBeNull();

  for (const step of spec.composeAtSteps) {
    const ctx: ComposeContext = {
      render: renderCtx({ project: spec.project, mode: step }),
      globalVars: spec.globalVars ?? {},
      projectVars: spec.projectVars ?? {},
      launchVars: spec.launchVars ?? {},
      maxWorkflowChars: DEFAULT_MAX_WORKFLOW_CHARS,
    };
    const composed = composeWorkflow({
      loadedModules: bundle.loadedModules,
      workflow: bundle.workflow!,
      step,
      ctx,
    });
    const composeErrs = errors(composed.diagnostics);
    if (composeErrs.length > 0) {
      throw new Error(
        `Example "${spec.name}" step "${step}" composer errors:\n${format(composeErrs)}`,
      );
    }
    // Sanity: the composed prompt is non-empty for steps we declared.
    expect(composed.text.length, `Example "${spec.name}" step "${step}" should not be empty`).toBeGreaterThan(0);
  }
}

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe("docs/examples — every shipped tutorial example loads + composes cleanly", () => {
  for (const spec of EXAMPLES) {
    it(`example "${spec.name}" produces zero error-severity diagnostics`, async () => {
      await assertExampleClean(spec);
    });
  }
});

describe("docs/examples — manifest is in sync with the filesystem", () => {
  it("every subdirectory under docs/examples/ is named in the manifest", () => {
    const onDisk = readdirSync(EXAMPLES_ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    const inManifest = EXAMPLES.map((e) => e.name).sort();
    expect(onDisk).toEqual(inManifest);
  });
});
