import {
  PLAN_PLACEHOLDER,
  INITIAL_EVAL_PLACEHOLDER,
  NOTES_PLACEHOLDER,
  SUMMARY_PLACEHOLDER,
} from "./issueTemplate";

const PLACEHOLDERS = new Set<string>([
  PLAN_PLACEHOLDER,
  INITIAL_EVAL_PLACEHOLDER,
  NOTES_PLACEHOLDER,
  SUMMARY_PLACEHOLDER,
]);

const EMPTY_COMMENTS: Record<string, string> = {
  Plan: "<!-- empty — write this section now, before making changes -->",
  "Initial Evaluation":
    "<!-- empty — populated by the evaluator agent (op-evaluate) before planning -->",
  Notes: "<!-- empty — append a ### <ID>.<N> block per task as work completes -->",
  Summary: "<!-- empty — write this at /op:resolve time -->",
};

export function agentizeBody(raw: string): string {
  const lines = raw.split("\n");
  interface Section {
    heading: string | null;
    name: string | null;
    body: string[];
  }
  const sections: Section[] = [{ heading: null, name: null, body: [] }];
  let inFence = false;
  for (const line of lines) {
    if (/^```/.test(line.trim())) inFence = !inFence;
    const m = !inFence ? /^##\s+(.+?)\s*$/.exec(line) : null;
    if (m) {
      sections.push({ heading: line, name: m[1].trim(), body: [] });
    } else {
      sections[sections.length - 1].body.push(line);
    }
  }

  const out: string[] = [];
  for (const sec of sections) {
    if (sec.heading === null) {
      out.push(...sec.body);
      continue;
    }
    const filtered = sec.body.filter((l) => !PLACEHOLDERS.has(l.trim()));
    const comment = sec.name ? EMPTY_COMMENTS[sec.name] : undefined;
    out.push(sec.heading);
    if (comment) {
      const isEmpty = filtered.every((l) => l.trim() === "");
      if (isEmpty) {
        out.push("", comment, "");
      } else {
        out.push(...filtered);
      }
    } else {
      out.push(...filtered);
    }
  }
  return out.join("\n");
}
