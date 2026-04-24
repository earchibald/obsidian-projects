export const PLAN_PLACEHOLDER =
  "_To be written at /op:issue time — approach, key decisions, files to touch._";
export const INITIAL_EVAL_PLACEHOLDER =
  "_Filled by the evaluator agent — what's being asked, complexity, where it lands, open questions._";
export const NOTES_PLACEHOLDER =
  "_Filled as work progresses; one ### <ID>.<N> block per task._";
export const SUMMARY_PLACEHOLDER =
  "_Written at /op:resolve time — what shipped, key commits, follow-ups._";

export type Priority = "low" | "med" | "high";

export interface RenderInput {
  id: string;
  project: string;
  title: string;
  priority: Priority;
  scope: string[];
  assignee: string;
  githubIssue?: string;
}

export function renderIssueNote(i: RenderInput): string {
  const today = new Date().toISOString().slice(0, 10);
  const fmLines = [
    "---",
    `id: ${i.id}`,
    `project: ${i.project}`,
    "type: issue",
    "status: open",
    `priority: ${i.priority}`,
    `created: ${today}`,
    `assignee: ${i.assignee}`,
  ];
  if (i.githubIssue) fmLines.push(`github_issue: ${i.githubIssue}`);
  fmLines.push("tags:", `  - project/${i.project}`, "  - issue", "---", "");
  const fm = fmLines.join("\n");

  const body: string[] = [`# ${i.title}`, ""];
  body.push("## Scope", "");
  if (i.scope.length > 0) {
    for (const bullet of i.scope) {
      body.push(`- [ ] ${bullet.trim()}`);
    }
  }
  body.push("");
  body.push("## Plan", "", PLAN_PLACEHOLDER, "");
  body.push("## Initial Evaluation", "", INITIAL_EVAL_PLACEHOLDER, "");
  body.push("## Tasks", "");
  body.push("## Notes", "", NOTES_PLACEHOLDER, "");
  body.push("## Summary", "", SUMMARY_PLACEHOLDER, "");
  return fm + body.join("\n");
}
