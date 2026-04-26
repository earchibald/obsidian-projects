import { describe, it, expect } from "vitest";
import type { WorkflowDiagnostic, WorkflowDiagnosticCode } from "./workflowDiagnostic";
import {
  PRECEDENCE_SCOPES,
  codeLabel,
  diagnosticToBlock,
  diagnosticToLine,
  formatDiagnostic,
  formatDiagnostics,
  isPrecedenceScope,
  precedenceScopeAbbrev,
  precedenceScopeLabel,
  severityBadge,
  type PrecedenceScope,
} from "./workflowDiagnosticFormat";

const ALL_CODES: WorkflowDiagnosticCode[] = [
  "bad-model",
  "missing-var",
  "unknown-module",
  "schema-mismatch",
  "import-collision",
  "intra-scope-collision",
  "malformed-frontmatter",
];

const ALL_SCOPES: PrecedenceScope[] = ["module", "global", "project", "launch"];

function diag(over: Partial<WorkflowDiagnostic> = {}): WorkflowDiagnostic {
  return {
    code: "missing-var",
    severity: "warning",
    message: "Variable {{foo}} is undefined.",
    ...over,
  };
}

// ─── Precedence scope canonicalization ───────────────────────────────────

describe("precedence scopes", () => {
  it("maps every scope to a full canonical label", () => {
    expect(precedenceScopeLabel("module")).toBe("Module default");
    expect(precedenceScopeLabel("global")).toBe("Global default");
    expect(precedenceScopeLabel("project")).toBe("Project default");
    expect(precedenceScopeLabel("launch")).toBe("Launch override");
  });

  it("maps every scope to a single-letter abbreviation for tooltip text only", () => {
    expect(precedenceScopeAbbrev("module")).toBe("M");
    expect(precedenceScopeAbbrev("global")).toBe("G");
    expect(precedenceScopeAbbrev("project")).toBe("P");
    expect(precedenceScopeAbbrev("launch")).toBe("L");
  });

  it("isPrecedenceScope guards correctly", () => {
    for (const s of ALL_SCOPES) expect(isPrecedenceScope(s)).toBe(true);
    for (const bad of ["", "Module", "MODULE", "user", undefined, null, 0, {}]) {
      expect(isPrecedenceScope(bad)).toBe(false);
    }
  });

  it("PRECEDENCE_SCOPES is frozen — entries cannot be mutated", () => {
    expect(Object.isFrozen(PRECEDENCE_SCOPES)).toBe(true);
    expect(Object.isFrozen(PRECEDENCE_SCOPES.module)).toBe(true);
  });

  it("abbreviations are unique", () => {
    const seen = new Set<string>();
    for (const s of ALL_SCOPES) {
      const abbrev = precedenceScopeAbbrev(s);
      expect(seen.has(abbrev)).toBe(false);
      seen.add(abbrev);
    }
  });
});

// ─── Severity badges ─────────────────────────────────────────────────────

describe("severityBadge", () => {
  it("maps every severity to a single-letter glyph", () => {
    expect(severityBadge("error")).toBe("E");
    expect(severityBadge("warning")).toBe("W");
    expect(severityBadge("info")).toBe("I");
  });
});

// ─── Code labels ─────────────────────────────────────────────────────────

describe("codeLabel", () => {
  it("returns a sentence-case label for every WorkflowDiagnosticCode", () => {
    expect(codeLabel("bad-model")).toBe("Bad model spec");
    expect(codeLabel("missing-var")).toBe("Missing variable");
    expect(codeLabel("unknown-module")).toBe("Unknown module");
    expect(codeLabel("schema-mismatch")).toBe("Schema mismatch");
    expect(codeLabel("import-collision")).toBe("Import collision");
    expect(codeLabel("intra-scope-collision")).toBe("Intra-scope collision");
    expect(codeLabel("malformed-frontmatter")).toBe("Malformed frontmatter");
  });

  it("never returns the raw kebab-case code (verifies humanization happened)", () => {
    for (const code of ALL_CODES) {
      const label = codeLabel(code);
      expect(label).not.toBe(code);
      expect(label.startsWith(label[0]?.toUpperCase() ?? "")).toBe(true);
    }
  });
});

// ─── formatDiagnostic — exhaustiveness over codes ────────────────────────

describe("formatDiagnostic — every code", () => {
  for (const code of ALL_CODES) {
    it(`formats ${code} without throwing and populates the contract fields`, () => {
      const d = diag({ code, severity: "error", message: `msg for ${code}` });
      const f = formatDiagnostic(d);
      expect(f.code).toBe(code);
      expect(f.codeLabel).toBe(codeLabel(code));
      expect(f.severity).toBe("error");
      expect(f.severityBadge).toBe("E");
      expect(f.message).toBe(`msg for ${code}`);
      expect(typeof f.hint).toBe("string");
      expect(f.hint!.length).toBeGreaterThan(0);
    });
  }
});

describe("formatDiagnostic — passthrough fields", () => {
  it("copies severity verbatim and assigns the matching badge", () => {
    expect(formatDiagnostic(diag({ severity: "info" })).severityBadge).toBe("I");
    expect(formatDiagnostic(diag({ severity: "warning" })).severityBadge).toBe("W");
    expect(formatDiagnostic(diag({ severity: "error" })).severityBadge).toBe("E");
  });

  it("copies message verbatim — no rewriting", () => {
    const text = "Specific prose with {{tokens}} and 'punctuation'.";
    expect(formatDiagnostic(diag({ message: text })).message).toBe(text);
  });
});

// ─── Location summary ────────────────────────────────────────────────────

describe("formatDiagnostic — location summary", () => {
  it("is empty when no location fields are set", () => {
    expect(formatDiagnostic(diag()).location).toBe("");
  });

  it("includes moduleId, stepId, varName when present", () => {
    const f = formatDiagnostic(
      diag({ moduleId: "review", stepId: "lint", varName: "foo" }),
    );
    expect(f.location).toBe("module review · step lint · var foo");
  });

  it("appends extra.path when present", () => {
    const f = formatDiagnostic(
      diag({
        code: "malformed-frontmatter",
        moduleId: "broken",
        extra: { path: "Projects/_op-modules/broken.md", field: "scope" },
      }),
    );
    expect(f.location).toBe("module broken · Projects/_op-modules/broken.md");
  });

  it("ignores non-string extra.path", () => {
    const f = formatDiagnostic(
      diag({ moduleId: "x", extra: { path: 42 } }),
    );
    expect(f.location).toBe("module x");
  });
});

// ─── Precedence scope rendering ──────────────────────────────────────────

describe("formatDiagnostic — precedence scope", () => {
  it("omits scopeLabel and scopeAbbrev when extra.precedenceScope is absent", () => {
    const f = formatDiagnostic(diag());
    expect(f.scopeLabel).toBeUndefined();
    expect(f.scopeAbbrev).toBeUndefined();
  });

  it.each(ALL_SCOPES)("renders %s as full label + abbreviation", (scope) => {
    const f = formatDiagnostic(diag({ extra: { precedenceScope: scope } }));
    expect(f.scopeLabel).toBe(precedenceScopeLabel(scope));
    expect(f.scopeAbbrev).toBe(precedenceScopeAbbrev(scope));
  });

  it("ignores invalid extra.precedenceScope values silently", () => {
    const f = formatDiagnostic(diag({ extra: { precedenceScope: "user" } }));
    expect(f.scopeLabel).toBeUndefined();
    expect(f.scopeAbbrev).toBeUndefined();
  });

  it("never lets the abbreviation appear in primary copy fields", () => {
    const f = formatDiagnostic(diag({ extra: { precedenceScope: "module" } }));
    expect(f.message).not.toContain("(M)");
    expect(f.codeLabel).not.toContain("(M)");
    expect(f.codeLabel).not.toContain(" M ");
  });
});

// ─── formatDiagnostics — list passthrough ────────────────────────────────

describe("formatDiagnostics", () => {
  it("preserves order and length", () => {
    const xs = ALL_CODES.map((code) => diag({ code, message: code }));
    const fs = formatDiagnostics(xs);
    expect(fs).toHaveLength(xs.length);
    expect(fs.map((f) => f.code)).toEqual(ALL_CODES);
  });
});

// ─── diagnosticToLine — primary copy uses full scope name ────────────────

describe("diagnosticToLine", () => {
  it("renders the canonical shape with severity badge + label + message", () => {
    const line = diagnosticToLine(
      diag({ code: "missing-var", severity: "warning", message: "{{foo}} undefined." }),
    );
    expect(line).toBe("[W] Missing variable — {{foo}} undefined.");
  });

  it("appends location in parens when present", () => {
    const line = diagnosticToLine(
      diag({ moduleId: "m", stepId: "s", message: "m." }),
    );
    expect(line).toContain("(in module m · step s)");
  });

  it("appends the FULL scope label, not the abbreviation", () => {
    const line = diagnosticToLine(
      diag({ extra: { precedenceScope: "launch" } }),
    );
    expect(line).toContain("[Launch override]");
    expect(line).not.toContain("[L]");
  });

  it("emits a stable shape for every code (snapshot of structure, not text)", () => {
    for (const code of ALL_CODES) {
      const line = diagnosticToLine(diag({ code, severity: "error" }));
      expect(line).toMatch(/^\[E\] .+ — .+$/);
    }
  });
});

// ─── diagnosticToBlock — multi-line modal copy ───────────────────────────

describe("diagnosticToBlock", () => {
  it("starts with the code label and full severity word", () => {
    const block = diagnosticToBlock(diag({ severity: "error" }));
    expect(block.split("\n")[0]).toBe("Missing variable  (error)");
  });

  it("includes the message line and the hint line", () => {
    const block = diagnosticToBlock(diag({ severity: "info", message: "the message" }));
    const lines = block.split("\n");
    expect(lines).toContain("the message");
    expect(lines.some((l) => l.startsWith("Hint:"))).toBe(true);
  });

  it("renders precedence scope as the FULL canonical name in primary copy", () => {
    const block = diagnosticToBlock(
      diag({ extra: { precedenceScope: "project" } }),
    );
    expect(block).toContain("Project default");
    // Abbreviation must NOT appear as a standalone word in primary copy.
    expect(block).not.toMatch(/(^|\s)P(\s|$)/);
  });

  it("omits the location line when there is no location info", () => {
    const block = diagnosticToBlock(diag());
    const lines = block.split("\n");
    // Expected lines: codeLabel+severity, message, hint. No location.
    expect(lines).toHaveLength(3);
  });

  it("omits the scope line when no precedence scope is attached", () => {
    const block = diagnosticToBlock(diag({ moduleId: "m" }));
    expect(block).not.toContain("Module default");
    expect(block).not.toContain("Global default");
    expect(block).not.toContain("Project default");
    expect(block).not.toContain("Launch override");
  });
});
