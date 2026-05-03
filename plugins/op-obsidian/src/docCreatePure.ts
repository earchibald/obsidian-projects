// Pure helpers for op-doc-create. DOC notes live under
// `Projects/<slug>/DOCS/` and carry `type: doc` + `doc_type:` frontmatter
// (see Docs Index view in scaffoldProject's base template).
//
// Repo-symlinked `DOCS/superpowers/` is governed by the project repo's normal
// git workflow — out of scope for vault discipline. The handler refuses any
// path under `DOCS/superpowers/`.

export const DOC_TYPES = ["plan", "spec", "adr", "runbook"] as const;
export type DocType = (typeof DOC_TYPES)[number];

export function isDocType(v: string): v is DocType {
  return (DOC_TYPES as readonly string[]).includes(v);
}

export interface RenderDocInput {
  project: string;
  docType: DocType;
  title: string;
  body?: string;
}

export function renderDocNote(input: RenderDocInput): string {
  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    "---",
    `project: ${input.project}`,
    "type: doc",
    `doc_type: ${input.docType}`,
    `title: ${JSON.stringify(input.title)}`,
    `created: ${today}`,
    "op_managed: true",
    "tags:",
    `  - project/${input.project}`,
    "  - doc",
    `  - doc/${input.docType}`,
    "---",
    "",
    `# ${input.title}`,
    "",
  ];
  if (input.body && input.body.trim().length > 0) {
    lines.push(input.body.replace(/\s+$/g, ""), "");
  }
  return lines.join("\n");
}
