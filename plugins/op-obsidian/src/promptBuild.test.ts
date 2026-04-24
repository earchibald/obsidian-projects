import { describe, it, expect } from "vitest";
import { agentizeBody } from "./agentizeBody";
import {
  PLAN_PLACEHOLDER,
  INITIAL_EVAL_PLACEHOLDER,
  NOTES_PLACEHOLDER,
  SUMMARY_PLACEHOLDER,
} from "./issueTemplate";

const PLAN_EMPTY = "<!-- empty — write this section now, before making changes -->";
const INITIAL_EVAL_EMPTY =
  "<!-- empty — populated by the evaluator agent (op-evaluate) before planning -->";
const NOTES_EMPTY =
  "<!-- empty — append a ### <ID>.<N> block per task as work completes -->";
const SUMMARY_EMPTY = "<!-- empty — write this at /op:resolve time -->";

function skeleton(): string {
  return [
    "# Title",
    "",
    "## Plan",
    "",
    PLAN_PLACEHOLDER,
    "",
    "## Initial Evaluation",
    "",
    INITIAL_EVAL_PLACEHOLDER,
    "",
    "## Tasks",
    "",
    "## Notes",
    "",
    NOTES_PLACEHOLDER,
    "",
    "## Summary",
    "",
    SUMMARY_PLACEHOLDER,
    "",
  ].join("\n");
}

describe("agentizeBody", () => {
  it("replaces fresh-skeleton placeholders with empty-section comments", () => {
    const out = agentizeBody(skeleton());
    expect(out).toContain(PLAN_EMPTY);
    expect(out).toContain(INITIAL_EVAL_EMPTY);
    expect(out).toContain(NOTES_EMPTY);
    expect(out).toContain(SUMMARY_EMPTY);
    expect(out).not.toContain(PLAN_PLACEHOLDER);
    expect(out).not.toContain(INITIAL_EVAL_PLACEHOLDER);
    expect(out).not.toContain(NOTES_PLACEHOLDER);
    expect(out).not.toContain(SUMMARY_PLACEHOLDER);
  });

  it("Initial Evaluation collapses to empty comment when blank, preserves when filled", () => {
    const blank = ["# T", "", "## Initial Evaluation", "", "## Plan", ""].join("\n");
    expect(agentizeBody(blank)).toContain(INITIAL_EVAL_EMPTY);

    const filled = [
      "# T",
      "",
      "## Initial Evaluation",
      "",
      "Complexity: simple. Lands in foo.ts.",
      "",
      "## Plan",
      "",
    ].join("\n");
    const out = agentizeBody(filled);
    expect(out).toContain("Complexity: simple. Lands in foo.ts.");
    expect(out).not.toContain(INITIAL_EVAL_EMPTY);
  });

  it("preserves filled sections and fills only the empty ones (partial)", () => {
    const body = [
      "# T",
      "",
      "## Plan",
      "",
      "Real plan content here.",
      "",
      "## Notes",
      "",
      NOTES_PLACEHOLDER,
      "",
      "## Summary",
      "",
      SUMMARY_PLACEHOLDER,
      "",
    ].join("\n");
    const out = agentizeBody(body);
    expect(out).toContain("Real plan content here.");
    expect(out).not.toContain(PLAN_EMPTY);
    expect(out).toContain(NOTES_EMPTY);
    expect(out).toContain(SUMMARY_EMPTY);
  });

  it("leaves a fully filled body unchanged (no empty comments inserted)", () => {
    const body = [
      "# T",
      "",
      "## Plan",
      "",
      "plan body",
      "",
      "## Notes",
      "",
      "### OP-1.1 — did a thing",
      "",
      "## Summary",
      "",
      "shipped.",
      "",
    ].join("\n");
    const out = agentizeBody(body);
    expect(out).not.toContain(PLAN_EMPTY);
    expect(out).not.toContain(NOTES_EMPTY);
    expect(out).not.toContain(SUMMARY_EMPTY);
    expect(out).toContain("plan body");
    expect(out).toContain("### OP-1.1 — did a thing");
    expect(out).toContain("shipped.");
  });

  it("legacy bodies lacking the three sections pass through untouched", () => {
    const body = ["# T", "", "## Scope", "", "- [x] done", ""].join("\n");
    expect(agentizeBody(body)).toBe(body);
  });

  it("does not strip legitimate italic one-liners (false-positive guard)", () => {
    const body = [
      "# T",
      "",
      "## Plan",
      "",
      "_some legitimate aside_",
      "",
      "real content",
      "",
    ].join("\n");
    const out = agentizeBody(body);
    expect(out).toContain("_some legitimate aside_");
    expect(out).toContain("real content");
    expect(out).not.toContain(PLAN_EMPTY);
  });

  it("does not treat ^## inside a fenced code block as a section boundary", () => {
    const body = [
      "# T",
      "",
      "## Plan",
      "",
      "```md",
      "## Not a heading",
      "```",
      "",
      "## Summary",
      "",
      SUMMARY_PLACEHOLDER,
      "",
    ].join("\n");
    const out = agentizeBody(body);
    // Plan has real content (the fenced block) → no Plan empty comment
    expect(out).not.toContain(PLAN_EMPTY);
    expect(out).toContain("## Not a heading");
    expect(out).toContain(SUMMARY_EMPTY);
  });

  it("classifies whitespace-only section body as empty", () => {
    const body = ["## Plan", "", "", "## Tasks", ""].join("\n");
    const out = agentizeBody(body);
    expect(out).toContain(PLAN_EMPTY);
  });

  it("Scope and unknown sections pass through unchanged", () => {
    const body = [
      "## Scope",
      "",
      "- bullet",
      "",
      "## Random",
      "",
      "stuff",
      "",
    ].join("\n");
    const out = agentizeBody(body);
    expect(out).toContain("- bullet");
    expect(out).toContain("stuff");
  });
});
