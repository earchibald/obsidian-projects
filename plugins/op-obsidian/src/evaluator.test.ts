import { describe, it, expect, vi } from "vitest";
import {
  buildEvaluatorPrompt,
  parseEvaluatorClassification,
  runEvaluatorFlow,
} from "./evaluator";
import type { IssueEntry } from "./types";
import { makeTestRelay } from "./relaySession";

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

  it("OP-199 (2b): prepends the workflowSection when supplied", () => {
    const p = buildEvaluatorPrompt(
      entry,
      "scope",
      "## Project workflow\n\nReview-step rules.",
    );
    // Workflow section appears before the evaluator's first directive.
    const wfIdx = p.indexOf("## Project workflow");
    const evalIdx = p.indexOf("Evaluate ");
    expect(wfIdx).toBeGreaterThanOrEqual(0);
    expect(evalIdx).toBeGreaterThan(wfIdx);
  });

  it("OP-199 (2b): null workflowSection leaves the prompt byte-identical to pre-OP-199 shape", () => {
    const withoutArg = buildEvaluatorPrompt(entry, "scope");
    const withNull = buildEvaluatorPrompt(entry, "scope", null);
    expect(withNull).toBe(withoutArg);
  });

  it("OP-199 (2b): empty/whitespace workflowSection is treated as no injection", () => {
    const p = buildEvaluatorPrompt(entry, "scope", "   \n\n  ");
    expect(p).not.toContain("## Project workflow");
    // Same shape as the no-arg call.
    expect(p).toBe(buildEvaluatorPrompt(entry, "scope"));
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
      { launch, setEvaluation, setFlow, relaySession: makeTestRelay() },
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
      runEvaluatorFlow({ launch, setEvaluation, setFlow, relaySession: makeTestRelay() }, entry, ""),
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
      runEvaluatorFlow({ launch, setEvaluation, setFlow, relaySession: makeTestRelay() }, entry, ""),
    ).rejects.toThrow(/COMPLEXITY/);
    expect(setEvaluation).not.toHaveBeenCalled();
    expect(setFlow).not.toHaveBeenCalled();
  });

  it("OP-199 (2b): composeWorkflowSection dep is invoked and its result threads into the launched prompt", async () => {
    const composeWorkflowSection = vi
      .fn()
      .mockResolvedValue("## Project workflow\n\nEvaluate-step rules.");
    const launch = vi.fn().mockResolvedValue({
      text: "body\nCOMPLEXITY: simple",
      jsonResult: {},
      stdout: "",
      stderr: "",
      exitCode: 0,
      durationMs: 1,
    });
    const setEvaluation = vi.fn().mockResolvedValue({ issueId: entry.id, path: entry.path, evaluation: "body", replaced: false });
    const setFlow = vi.fn().mockResolvedValue({ issueId: entry.id, path: entry.path, flow: "evaluate", complexity: "simple" });
    await runEvaluatorFlow(
      { launch, setEvaluation, setFlow, relaySession: makeTestRelay(), composeWorkflowSection },
      entry,
      "scope",
    );
    expect(composeWorkflowSection).toHaveBeenCalledTimes(1);
    expect(launch.mock.calls[0][0].prompt).toContain("Evaluate-step rules.");
  });

  it("OP-199 (2b): composeWorkflowSection returning null leaves the prompt byte-identical to no-dep shape", async () => {
    const composeWorkflowSection = vi.fn().mockResolvedValue(null);
    const launch = vi.fn().mockResolvedValue({
      text: "body\nCOMPLEXITY: simple",
      jsonResult: {},
      stdout: "",
      stderr: "",
      exitCode: 0,
      durationMs: 1,
    });
    const setEvaluation = vi.fn().mockResolvedValue({ issueId: entry.id, path: entry.path, evaluation: "body", replaced: false });
    const setFlow = vi.fn().mockResolvedValue({ issueId: entry.id, path: entry.path, flow: "evaluate", complexity: "simple" });

    const launchNoDep = vi.fn().mockResolvedValue({
      text: "body\nCOMPLEXITY: simple",
      jsonResult: {},
      stdout: "",
      stderr: "",
      exitCode: 0,
      durationMs: 1,
    });
    await runEvaluatorFlow(
      { launch, setEvaluation, setFlow, relaySession: makeTestRelay(), composeWorkflowSection },
      entry,
      "scope",
    );
    await runEvaluatorFlow(
      { launch: launchNoDep, setEvaluation, setFlow, relaySession: makeTestRelay() },
      entry,
      "scope",
    );
    expect(launch.mock.calls[0][0].prompt).toBe(launchNoDep.mock.calls[0][0].prompt);
  });

  it("OP-199 (2b): composeWorkflowSection that throws is fail-soft — launch proceeds without injection", async () => {
    const composeWorkflowSection = vi.fn().mockRejectedValue(new Error("compose blew up"));
    const launch = vi.fn().mockResolvedValue({
      text: "body\nCOMPLEXITY: simple",
      jsonResult: {},
      stdout: "",
      stderr: "",
      exitCode: 0,
      durationMs: 1,
    });
    const setEvaluation = vi.fn().mockResolvedValue({ issueId: entry.id, path: entry.path, evaluation: "body", replaced: false });
    const setFlow = vi.fn().mockResolvedValue({ issueId: entry.id, path: entry.path, flow: "evaluate", complexity: "simple" });
    const result = await runEvaluatorFlow(
      { launch, setEvaluation, setFlow, relaySession: makeTestRelay(), composeWorkflowSection },
      entry,
      "scope",
    );
    expect(result.complexity).toBe("simple");
    // Prompt has no workflow section.
    expect(launch.mock.calls[0][0].prompt).not.toContain("## Project workflow");
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
      runEvaluatorFlow({ launch, setEvaluation, setFlow, relaySession: makeTestRelay() }, entry, ""),
    ).rejects.toThrow(/vault locked/);
    expect(setFlow).not.toHaveBeenCalled();
  });
});
