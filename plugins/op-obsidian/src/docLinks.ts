// Pure registry of in-product help-link targets. OP-215 (10e).
//
// Single source of truth for every "?" icon in the Settings tab and every
// docFooter line stamped on `op-explain-workflow` / `op-list-vars` payloads.
// The `docLinks.test.ts` CI guard parses the relevant docs under
// `docs/workflow-modules/` and asserts every (file, anchor) referenced here
// exists — so a doc rename or anchor change shows up as a unit-test failure
// rather than a broken in-product link.
//
// Pure: no Obsidian imports, no I/O. Strings only.

/**
 * Section ids that may carry a help link. Mirrors `SectionId` from
 * `settings.ts` plus the synthetic `workflowsVars` (the Available
 * variables collapsible) so `addDocLink(parentEl, "workflowsVars")` is
 * type-safe at the call site.
 */
export type DocLinkSectionId =
  | "workflows"
  | "workflowsVars"
  | "injection";

/**
 * Diagnostic-code subset that gets a docFooter in CLI payloads. Not every
 * `WorkflowDiagnosticCode` rates a footer — `size-budget` is a notice, not
 * a failure mode users typically chase docs for — but every code listed
 * here MUST have a corresponding anchor in
 * `docs/workflow-modules/03-troubleshooting.md`.
 */
export type DocLinkDiagnosticCode =
  | "bad-model"
  | "missing-var"
  | "unknown-module"
  | "schema-mismatch"
  | "import-collision"
  | "intra-scope-collision"
  | "malformed-frontmatter"
  | "size-budget";

/**
 * Vault-relative paths to the docs we link to. Single point of update if
 * the docs reorganize.
 */
const DOC_PATHS = {
  troubleshooting: "docs/workflow-modules/03-troubleshooting.md",
  faq: "docs/workflow-modules/04-faq.md",
  settingsReference: "docs/workflow-modules/05-settings-reference.md",
} as const;

/**
 * Public GitHub URL prefix used for "?" icons. Matches the pattern
 * `firstRunReadme.ts` already established in OP-211 — stable URL, no
 * Obsidian-relative-link rendering hassles.
 */
export const DOC_URL_PREFIX =
  "https://github.com/earchibald/obsidian-projects/blob/main/";

export interface DocAnchor {
  /** Vault-relative doc path. */
  file: string;
  /** GitHub-flavored markdown anchor (lowercase + dashes; no leading `#`). */
  anchor: string;
}

const SECTION_LINKS: Readonly<Record<DocLinkSectionId, DocAnchor>> = Object.freeze({
  workflows: {
    file: DOC_PATHS.settingsReference,
    anchor: "the-workflows-group",
  },
  workflowsVars: {
    file: DOC_PATHS.settingsReference,
    anchor: "available-variables-panel",
  },
  injection: {
    file: DOC_PATHS.settingsReference,
    anchor: "injection--what-the-migration-changed",
  },
});

const DIAGNOSTIC_LINKS: Readonly<Record<DocLinkDiagnosticCode, DocAnchor>> =
  Object.freeze({
    "bad-model": { file: DOC_PATHS.troubleshooting, anchor: "bad-model" },
    "missing-var": { file: DOC_PATHS.troubleshooting, anchor: "missing-var" },
    "unknown-module": { file: DOC_PATHS.troubleshooting, anchor: "unknown-module" },
    "schema-mismatch": { file: DOC_PATHS.troubleshooting, anchor: "schema-mismatch" },
    "import-collision": { file: DOC_PATHS.troubleshooting, anchor: "import-collision" },
    "intra-scope-collision": {
      file: DOC_PATHS.troubleshooting,
      anchor: "intra-scope-collision",
    },
    "malformed-frontmatter": {
      file: DOC_PATHS.troubleshooting,
      anchor: "malformed-frontmatter",
    },
    "size-budget": { file: DOC_PATHS.troubleshooting, anchor: "size-budget" },
  });

export function sectionDocAnchor(id: DocLinkSectionId): DocAnchor {
  return SECTION_LINKS[id];
}

export function diagnosticDocAnchor(code: DocLinkDiagnosticCode): DocAnchor {
  return DIAGNOSTIC_LINKS[code];
}

/**
 * Compose the public URL for a (file, anchor) pair. Use this everywhere a
 * URL is needed — never hand-concatenate, so a future swap to a versioned
 * URL or a docs site is one edit here.
 */
export function docUrl(target: DocAnchor): string {
  return `${DOC_URL_PREFIX}${target.file}#${target.anchor}`;
}

/**
 * Iterables for the CI guard. Returns every (file, anchor) pair the
 * registry references; the test asserts each anchor exists in its file.
 */
export function allDocAnchors(): readonly DocAnchor[] {
  return [
    ...Object.values(SECTION_LINKS),
    ...Object.values(DIAGNOSTIC_LINKS),
  ];
}

/**
 * Doc files referenced by the registry — the CI guard reads each once and
 * builds an anchor set per file, so we expose the unique list.
 */
export function allDocFiles(): readonly string[] {
  const set = new Set<string>();
  for (const anchor of allDocAnchors()) set.add(anchor.file);
  return [...set];
}
