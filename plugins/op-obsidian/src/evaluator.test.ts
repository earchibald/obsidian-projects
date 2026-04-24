import { describe, it, expect, vi } from "vitest";
import {
  buildEvaluatorPrompt,
  parseEvaluatorClassification,
  runEvaluatorFlow,
} from "./evaluator";
import type { IssueEntry } from "./types";

const entry: IssueEntry = {
  id: "OP-99",
  title: "OP-99 test evaluator",
  project: "obsidian-projects",
  status: "in-progress",
  path: "Projects/obsidian-projects/ISSUES/OP-99 test evaluator.md",
  type: "issue",
  resolvedFolder: false,
};

describe("parseEvaluatorClassification", () => {
  it("extracts 'simple' from the trailing marker and strips it", () => {
    const raw = "A short evaluation of the issue.\n\nIt looks straightforward.\n\nCOMPLEXITY: simple\n";
    const r = parseEvaluatorClassification(raw);
    expect(r.complexity).toBe("simple");
    expect(r.evaluation).toBe(
      "A short evaluation of the issue.\n\nIt looks straightforward.",
    );
  });

  it("extracts 'complex' and is case-insensitive on the marker", () => {
    const raw = "body goes here\ncomplexity: COMPLEX";
    const r = parseEvaluatorClassification(raw);
    expect(r.complexity).toBe("complex");
    expect(r.evaluation).toBe("body goes here");
  });

  it("throws when the marker is missing", () => {
    expect(() => parseEvaluatorClassification("evaluation body\n\nno marker here")).toThrow(
      /COMPLEXITY: simple\|complex/,
    );
  });

  it("throws on an unrecognized value", () => {
    expect(() => parseEvaluatorClassification("body\n\nCOMPLEXITY: medium")).toThrow();
  });

  it("throws on an empty response", () => {
    expect(() => parseEvaluatorClassification("")).toThrow(/empty/);
  });

  it("throws when only the marker is present (no evaluation body)", () => {
    expect(() => parseEvaluatorClassification("COMPLEXITY: simple")).toThrow(
      /no evaluation body/,
    );
  });
});

describe("buildEvaluatorPrompt", () => {
  it("includes issue id/title/project/path and the body", () => {
    const p = buildEvaluatorPrompt(entry, "Scope bullet a\nScope bullet b");
    expect(p).toContain("OP-99");
    expect(p).toContain("obsidian-projects");
    expect(p).toContain(entry.path);
    expect(p).toContain("Scope bullet a");
    expect(p).toContain("COMPLEXITY: simple");
  });

  it("omits the body section when empty", () => {
    const p = buildEvaluatorPrompt(entry, "   \n\n");
    expect(p).not.toContain("## Issue body");
  });
});

describe("runEvaluatorFlow", () => {
  it("happy path: launch → setEvaluation → setFlow(complexity, flow='evaluate')", async () => {
    const launch = vi.fn().mockResolvedValue({
      text: "eval body here\n\nCOMPLEXITY: simple",
      jsonResult: {},
      stdout: "",
      stderr: "",
      exitCode: 0,
      durationMs: 1,
    });
    const setEvaluation = vi.fn().mockResolvedValue({
      issueId: entry.id,
      path: entry.path,
      evaluation: "eval body here",
      replaced: false,
    });
    const setFlow = vi.fn().mockResolvedValue({
      issueId: entry.id,
      path: entry.path,
      flow: "evaluate",
      complexity: "simple",
    });
    const res = await runEvaluatorFlow(
      { launch, setEvaluation, setFlow },
      entry,
      "scope",
    );
    expect(res.complexity).toBe("simple");
    expect(res.evaluation).toBe("eval body here");
    expect(launch).toHaveBeenCalledTimes(1);
    expect(launch.mock.calls[0][0]).toMatchObject({
      agent: "op-evaluate",
      permissionMode: "dontAsk",
    });
    expect(setEvaluation).toHaveBeenCalledWith(entry, "eval body here");
    expect(setFlow).toHaveBeenCalledWith(entry, {
      flow: "evaluate",
      complexity: "simple",
    });
  });

  it("launch failure propagates and skips setEvaluation/setFlow", async () => {
    const launch = vi.fn().mockRejectedValue(new Error("boom"));
    const setEvaluation = vi.fn();
    const setFlow = vi.fn();
    await expect(
      runEvaluatorFlow({ launch, setEvaluation, setFlow }, entry, ""),
    ).rejects.toThrow(/boom/);
    expect(setEvaluation).not.toHaveBeenCalled();
    expect(setFlow).not.toHaveBeenCalled();
  });

  it("missing classification trailer skips setEvaluation/setFlow", async () => {
    const launch = vi.fn().mockResolvedValue({
      text: "body with no trailer",
      jsonResult: {},
      stdout: "",
      stderr: "",
      exitCode: 0,
      durationMs: 1,
    });
    const setEvaluation = vi.fn();
    const setFlow = vi.fn();
    await expect(
      runEvaluatorFlow({ launch, setEvaluation, setFlow }, entry, ""),
    ).rejects.toThrow(/COMPLEXITY/);
    expect(setEvaluation).not.toHaveBeenCalled();
    expect(setFlow).not.toHaveBeenCalled();
  });

  it("setEvaluation failure skips setFlow", async () => {
    const launch = vi.fn().mockResolvedValue({
      text: "body\nCOMPLEXITY: complex",
      jsonResult: {},
      stdout: "",
      stderr: "",
      exitCode: 0,
      durationMs: 1,
    });
    const setEvaluation = vi.fn().mockRejectedValue(new Error("vault locked"));
    const setFlow = vi.fn();
    await expect(
      runEvaluatorFlow({ launch, setEvaluation, setFlow }, entry, ""),
    ).rejects.toThrow(/vault locked/);
    expect(setFlow).not.toHaveBeenCalled();
  });
});
