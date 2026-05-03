// Pure helpers for op-task-create. Two responsibilities:
//   1. Allocate the next `<ID>.<N>` task id given the set of existing children
//      under the issue's TASKS folder, or honor an explicit `taskId` from the
//      caller (validated against the same set).
//   2. Render the TASK note's markdown body — frontmatter (with op_managed:
//      true and the issueLink: "[[<basename>]]" field that resolve.ts reads),
//      title heading, optional body.

export interface TaskFrontmatter {
  taskId: string;
  issueId: string;
  issueBasename: string;
  project: string;
  title: string;
  status?: "pending" | "in-progress" | "completed" | "blocked";
}

export const TASK_ID_RE = /^[A-Z][A-Z0-9]*-\d+\.\d+$/;

/**
 * Given the issue id (e.g. `OP-255`) and the list of existing task ids on disk
 * (any format), return the lowest unused `<issueId>.<N>` id starting at 1.
 *
 * Existing ids that don't match the `<issueId>.<N>` shape are ignored — they
 * could be tasks for a different issue accidentally co-located, or legacy
 * numbering schemes.
 */
export function nextTaskNumber(issueId: string, existingIds: readonly string[]): number {
  const prefix = `${issueId}.`;
  const used = new Set<number>();
  for (const id of existingIds) {
    if (!id.startsWith(prefix)) continue;
    const tail = id.slice(prefix.length);
    const n = Number.parseInt(tail, 10);
    if (Number.isFinite(n) && n > 0 && String(n) === tail) used.add(n);
  }
  let n = 1;
  while (used.has(n)) n += 1;
  return n;
}

/**
 * Validate an explicit `taskId` from the caller. Returns ok+normalized when
 * shape matches and prefix matches the issue; ok+exists when already taken.
 */
export function validateExplicitTaskId(
  issueId: string,
  taskId: string,
  existingIds: readonly string[],
): { ok: true; taskId: string } | { ok: false; error: string } {
  if (!TASK_ID_RE.test(taskId)) {
    return {
      ok: false,
      error: `taskId "${taskId}" must look like <ISSUE-ID>.<N> (e.g. OP-255.3)`,
    };
  }
  if (!taskId.startsWith(`${issueId}.`)) {
    return {
      ok: false,
      error: `taskId "${taskId}" prefix doesn't match issue ${issueId}`,
    };
  }
  if (existingIds.includes(taskId)) {
    return { ok: false, error: `taskId "${taskId}" already exists` };
  }
  return { ok: true, taskId };
}

/** Render the TASK note markdown body. Frontmatter carries `op_managed: true`. */
export function renderTaskNote(input: TaskFrontmatter, body?: string): string {
  const status = input.status ?? "pending";
  const lines = [
    "---",
    `id: ${input.taskId}`,
    // YAML key is `issue:` — read by issueStore.parseTask (issueStore.ts:192)
    // and surfaced as TaskEntry.issueLink, which resolve.ts walks at trash time.
    // Don't rename to `issueLink:` — that breaks op-resolve auto-trash.
    `issue: "[[${input.issueBasename}]]"`,
    `project: ${input.project}`,
    "type: task",
    `status: ${status}`,
    "op_managed: true",
    "tags:",
    `  - project/${input.project}`,
    "  - task",
    "---",
    "",
    `# ${input.title}`,
    "",
  ];
  if (body && body.trim().length > 0) {
    lines.push(body.replace(/\s+$/g, ""), "");
  }
  return lines.join("\n");
}
