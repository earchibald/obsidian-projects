import { describe, expect, it } from "vitest";
import {
  parseModule,
  parseVarDecl,
  parseVarDecls,
  validateIntraScopeCollisions,
  type ModuleSource,
  type VarDecl,
  type WorkflowModule,
} from "./workflowModulePure";

const GLOBAL_SOURCE: ModuleSource = {
  kind: "global",
  path: "Projects/_op-modules/sample.md",
};
const PROJECT_SOURCE: ModuleSource = {
  kind: "project",
  path: "Projects/obsidian-projects/MODULES/sample.md",
  projectSlug: "obsidian-projects",
};

describe("parseVarDecl — string forms", () => {
  type Case = {
    name: string;
    input: string;
    expected: VarDecl;
  };
  const cases: Case[] = [
    { name: "bare name", input: "foo", expected: { kind: "bare", name: "foo" } },
    { name: "bare name trims surrounding whitespace", input: "  foo  ", expected: { kind: "bare", name: "foo" } },
    {
      name: "name=VALUE shorthand",
      input: "bar=baz",
      expected: { kind: "default", name: "bar", value: "baz" },
    },
    {
      name: "empty default (name=)",
      input: "qux=",
      expected: { kind: "default", name: "qux", value: "" },
    },
    {
      name: "name=VALUE preserves =-in-value (only first = splits)",
      input: "expr=a=b=c",
      expected: { kind: "default", name: "expr", value: "a=b=c" },
    },
    {
      name: "value preserves leading/trailing whitespace",
      input: "label= hi ",
      expected: { kind: "default", name: "label", value: " hi " },
    },
    {
      name: "value preserves quotes verbatim — we do not unwrap",
      input: 'pkg="op-obsidian"',
      expected: { kind: "default", name: "pkg", value: '"op-obsidian"' },
    },
    {
      name: "YAML auto-coerced types: name=2026-04-25 stays string",
      // This is the canonical 1b test: when YAML keeps `name=2026-04-25` as a
      // string (because the `=` makes it ambiguous), the parser must split on
      // `=` and emit a string value — never a Date object. The Date-rejection
      // path is covered separately by the `wrong-type` table below.
      input: "due=2026-04-25",
      expected: { kind: "default", name: "due", value: "2026-04-25" },
    },
    {
      name: "name with spaces: spaces inside the name are preserved (caller's problem)",
      input: "first name=Ada",
      expected: { kind: "default", name: "first name", value: "Ada" },
    },
  ];
  for (const c of cases) {
    it(c.name, () => {
      const r = parseVarDecl(c.input);
      expect(r.diagnostics).toEqual([]);
      expect(r.decl).toEqual(c.expected);
    });
  }
});

describe("parseVarDecl — object forms", () => {
  it("name only", () => {
    const r = parseVarDecl({ name: "pkg" });
    expect(r.diagnostics).toEqual([]);
    expect(r.decl).toEqual({ kind: "object", name: "pkg" });
  });

  it("name + default + description", () => {
    const r = parseVarDecl({ name: "pkg", default: "op-obsidian", description: "Package name" });
    expect(r.diagnostics).toEqual([]);
    expect(r.decl).toEqual({
      kind: "object",
      name: "pkg",
      default: "op-obsidian",
      description: "Package name",
    });
  });

  it("name + description (no default)", () => {
    const r = parseVarDecl({ name: "verbose", description: "Toggle verbose output" });
    expect(r.diagnostics).toEqual([]);
    expect(r.decl).toEqual({
      kind: "object",
      name: "verbose",
      description: "Toggle verbose output",
    });
  });

  it("default of empty string is preserved", () => {
    const r = parseVarDecl({ name: "x", default: "" });
    expect(r.diagnostics).toEqual([]);
    expect(r.decl).toEqual({ kind: "object", name: "x", default: "" });
  });

  it("trims whitespace from name", () => {
    const r = parseVarDecl({ name: "  pkg  " });
    expect(r.decl).toEqual({ kind: "object", name: "pkg" });
  });

  it("unknown keys are tolerated (forward-compat)", () => {
    const r = parseVarDecl({ name: "pkg", futureField: 42 });
    expect(r.diagnostics).toEqual([]);
    expect(r.decl).toEqual({ kind: "object", name: "pkg" });
  });
});

describe("parseVarDecl — malformed", () => {
  it("empty string", () => {
    const r = parseVarDecl("");
    expect(r.decl).toBeNull();
    expect(r.diagnostics[0].code).toBe("malformed-frontmatter");
  });

  it("whitespace-only string", () => {
    const r = parseVarDecl("   ");
    expect(r.decl).toBeNull();
    expect(r.diagnostics[0].code).toBe("malformed-frontmatter");
  });

  it("= only (no name, no value)", () => {
    // eqIdx=0, rawName="" → empty name → malformed.  Verify no off-by-one
    // that would let name="" slip through as a valid bare.
    const r = parseVarDecl("=");
    expect(r.decl).toBeNull();
    expect(r.diagnostics[0].code).toBe("malformed-frontmatter");
  });

  it("=value (empty name)", () => {
    const r = parseVarDecl("=value");
    expect(r.decl).toBeNull();
    expect(r.diagnostics[0].code).toBe("malformed-frontmatter");
  });

  it("whitespace-name= (whitespace-only name)", () => {
    const r = parseVarDecl("   =value");
    expect(r.decl).toBeNull();
    expect(r.diagnostics[0].code).toBe("malformed-frontmatter");
  });

  it("number", () => {
    const r = parseVarDecl(42);
    expect(r.decl).toBeNull();
    expect(r.diagnostics[0].code).toBe("malformed-frontmatter");
  });

  it("boolean", () => {
    const r = parseVarDecl(true);
    expect(r.decl).toBeNull();
    expect(r.diagnostics[0].code).toBe("malformed-frontmatter");
  });

  it("Date (YAML auto-coerced ISO date)", () => {
    // If YAML sees a bare `- 2026-04-25` (no `=`, no quotes), it auto-coerces
    // to a Date. The parser must reject and surface a clear hint that the
    // user should quote the value to keep it as a string.
    const r = parseVarDecl(new Date("2026-04-25"));
    expect(r.decl).toBeNull();
    expect(r.diagnostics).toHaveLength(1);
    expect(r.diagnostics[0].code).toBe("malformed-frontmatter");
    expect(r.diagnostics[0].message).toMatch(/Date/);
  });

  it("null", () => {
    const r = parseVarDecl(null);
    expect(r.decl).toBeNull();
    expect(r.diagnostics[0].code).toBe("malformed-frontmatter");
  });

  it("array", () => {
    const r = parseVarDecl(["foo"]);
    expect(r.decl).toBeNull();
    expect(r.diagnostics[0].code).toBe("malformed-frontmatter");
  });

  it("object missing name", () => {
    const r = parseVarDecl({ default: "x" });
    expect(r.decl).toBeNull();
    expect(r.diagnostics[0].code).toBe("malformed-frontmatter");
  });

  it("object name is empty string", () => {
    const r = parseVarDecl({ name: "" });
    expect(r.decl).toBeNull();
    expect(r.diagnostics[0].code).toBe("malformed-frontmatter");
  });

  it("object name is whitespace-only", () => {
    const r = parseVarDecl({ name: "   " });
    expect(r.decl).toBeNull();
    expect(r.diagnostics[0].code).toBe("malformed-frontmatter");
  });

  it("object name is non-string", () => {
    const r = parseVarDecl({ name: 42 });
    expect(r.decl).toBeNull();
    expect(r.diagnostics[0].code).toBe("malformed-frontmatter");
  });

  it("object default is a Date (YAML auto-coerced)", () => {
    const r = parseVarDecl({ name: "due", default: new Date("2026-04-25") });
    expect(r.decl).toBeNull();
    expect(r.diagnostics[0].code).toBe("malformed-frontmatter");
    expect(r.diagnostics[0].message).toMatch(/Date/);
    expect(r.diagnostics[0].varName).toBe("due");
  });

  it("object default is a number", () => {
    const r = parseVarDecl({ name: "n", default: 42 });
    expect(r.decl).toBeNull();
    expect(r.diagnostics[0].code).toBe("malformed-frontmatter");
    expect(r.diagnostics[0].varName).toBe("n");
  });

  it("object description is non-string", () => {
    const r = parseVarDecl({ name: "n", description: 7 });
    expect(r.decl).toBeNull();
    expect(r.diagnostics[0].code).toBe("malformed-frontmatter");
    expect(r.diagnostics[0].varName).toBe("n");
  });
});

describe("parseVarDecls — list-level", () => {
  it("undefined / null → empty list, no diagnostics", () => {
    expect(parseVarDecls(undefined)).toEqual({ decls: [], diagnostics: [] });
    expect(parseVarDecls(null)).toEqual({ decls: [], diagnostics: [] });
  });

  it("non-array (string) → diagnostic, empty list", () => {
    const r = parseVarDecls("foo");
    expect(r.decls).toEqual([]);
    expect(r.diagnostics).toHaveLength(1);
    expect(r.diagnostics[0].code).toBe("malformed-frontmatter");
  });

  it("empty array → empty list, no diagnostics", () => {
    expect(parseVarDecls([])).toEqual({ decls: [], diagnostics: [] });
  });

  it("mixed valid + invalid → keeps valid, emits diagnostics for invalid", () => {
    const r = parseVarDecls(["foo", 42, "bar=baz", { name: "" }]);
    expect(r.decls).toEqual([
      { kind: "bare", name: "foo" },
      { kind: "default", name: "bar", value: "baz" },
    ]);
    expect(r.diagnostics).toHaveLength(2);
    expect(r.diagnostics.every((d) => d.code === "malformed-frontmatter")).toBe(true);
  });

  it("duplicate-name-within-one-module → keeps first, emits diagnostic for each duplicate", () => {
    const r = parseVarDecls(["foo", "foo=bar", { name: "foo", description: "third" }]);
    expect(r.decls).toEqual([{ kind: "bare", name: "foo" }]);
    expect(r.diagnostics).toHaveLength(2);
    for (const d of r.diagnostics) {
      expect(d.code).toBe("malformed-frontmatter");
      expect(d.varName).toBe("foo");
    }
  });

  it("bare x beats empty-default x= on duplicate (first-wins, not most-specific)", () => {
    // `["x", "x="]` → bare is first, empty-default is duplicate → bare wins.
    // The composer (1d) must satisfy a bare from a higher-precedence source;
    // the empty-default would have supplied "". First-wins is the documented
    // rule; there is no "more-specific wins" tie-break.
    const r = parseVarDecls(["x", "x="]);
    expect(r.decls).toEqual([{ kind: "bare", name: "x" }]);
    expect(r.diagnostics).toHaveLength(1);
    expect(r.diagnostics[0].code).toBe("malformed-frontmatter");
    expect(r.diagnostics[0].varName).toBe("x");
  });

  it("empty-default x= beats bare x on duplicate when empty-default is listed first", () => {
    // Symmetry check: whichever appears first in the list wins.
    const r = parseVarDecls(["x=", "x"]);
    expect(r.decls).toEqual([{ kind: "default", name: "x", value: "" }]);
    expect(r.diagnostics).toHaveLength(1);
    expect(r.diagnostics[0].varName).toBe("x");
  });

  it("string + object mix preserves order", () => {
    const r = parseVarDecls([
      "first",
      { name: "second", description: "two" },
      "third=3",
    ]);
    expect(r.decls).toEqual([
      { kind: "bare", name: "first" },
      { kind: "object", name: "second", description: "two" },
      { kind: "default", name: "third", value: "3" },
    ]);
    expect(r.diagnostics).toEqual([]);
  });
});

describe("parseModule", () => {
  function fmBase(over: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: "sample",
      title: "Sample",
      type: "workflow-module",
      scope: "pre-commit",
      ...over,
    };
  }

  it("happy path — all required fields", () => {
    const r = parseModule({ id: "sample", frontmatter: fmBase(), source: GLOBAL_SOURCE });
    expect(r.diagnostics).toEqual([]);
    expect(r.module).toEqual({
      id: "sample",
      title: "Sample",
      scope: "pre-commit",
      project: undefined,
      agent: undefined,
      order: 0,
      lazy: false,
      vars: [],
      source: GLOBAL_SOURCE,
    });
  });

  it("populates optional fields", () => {
    const r = parseModule({
      id: "sample",
      frontmatter: fmBase({
        project: "obsidian-projects",
        agent: "claude",
        order: 10,
        vars: ["foo", "bar=baz"],
      }),
      source: PROJECT_SOURCE,
    });
    expect(r.diagnostics).toEqual([]);
    expect(r.module).toMatchObject({
      project: "obsidian-projects",
      agent: "claude",
      order: 10,
      vars: [
        { kind: "bare", name: "foo" },
        { kind: "default", name: "bar", value: "baz" },
      ],
    });
  });

  it("rejects missing frontmatter", () => {
    const r = parseModule({ id: "sample", frontmatter: null, source: GLOBAL_SOURCE });
    expect(r.module).toBeNull();
    expect(r.diagnostics[0].code).toBe("malformed-frontmatter");
    expect(r.diagnostics[0].extra?.path).toBe(GLOBAL_SOURCE.path);
  });

  it("rejects wrong type", () => {
    const r = parseModule({
      id: "sample",
      frontmatter: { ...fmBase(), type: "issue" },
      source: GLOBAL_SOURCE,
    });
    expect(r.module).toBeNull();
    expect(r.diagnostics).toHaveLength(1);
    expect(r.diagnostics[0].message).toMatch(/workflow-module/);
  });

  it("rejects id mismatch (filename vs frontmatter id)", () => {
    const r = parseModule({
      id: "sample",
      frontmatter: fmBase({ id: "different" }),
      source: GLOBAL_SOURCE,
    });
    expect(r.module).toBeNull();
    expect(r.diagnostics[0].code).toBe("malformed-frontmatter");
    expect(r.diagnostics[0].extra?.expected).toBe("sample");
    expect(r.diagnostics[0].extra?.actual).toBe("different");
  });

  it("rejects id missing entirely from frontmatter (not just wrong value)", () => {
    // Delete `id` so it is absent — different code path from an id mismatch.
    const fm = { ...fmBase() };
    delete fm.id;
    const r = parseModule({ id: "sample", frontmatter: fm, source: GLOBAL_SOURCE });
    expect(r.module).toBeNull();
    expect(r.diagnostics[0].code).toBe("malformed-frontmatter");
    // Should surface a clear "field: id" payload so consumers can distinguish
    // this from an id-mismatch.
    expect(r.diagnostics[0].extra?.field).toBe("id");
  });

  it("rejects missing title / scope", () => {
    const r1 = parseModule({
      id: "sample",
      frontmatter: fmBase({ title: undefined }),
      source: GLOBAL_SOURCE,
    });
    expect(r1.module).toBeNull();

    const r2 = parseModule({
      id: "sample",
      frontmatter: fmBase({ scope: "" }),
      source: GLOBAL_SOURCE,
    });
    expect(r2.module).toBeNull();
  });

  it("rejects non-integer order", () => {
    const r = parseModule({
      id: "sample",
      frontmatter: fmBase({ order: 1.5 }),
      source: GLOBAL_SOURCE,
    });
    expect(r.module).toBeNull();
    expect(r.diagnostics[0].extra?.field).toBe("order");
  });

  it("treats absent project/agent/order as defaults (not errors)", () => {
    const r = parseModule({
      id: "sample",
      frontmatter: fmBase(),
      source: GLOBAL_SOURCE,
    });
    expect(r.module?.project).toBeUndefined();
    expect(r.module?.agent).toBeUndefined();
    expect(r.module?.order).toBe(0);
  });

  it("project: '' is treated as absent (not a hard-fail)", () => {
    // Authors sometimes write `project: ""` to mean "no restriction".
    // The loader must not hard-fail the module for this — treat it as absent.
    const r = parseModule({
      id: "sample",
      frontmatter: fmBase({ project: "" }),
      source: GLOBAL_SOURCE,
    });
    expect(r.module).not.toBeNull();
    expect(r.module?.project).toBeUndefined();
    expect(r.diagnostics).toEqual([]);
  });

  it("agent: '' is treated as absent (not a hard-fail)", () => {
    const r = parseModule({
      id: "sample",
      frontmatter: fmBase({ agent: "" }),
      source: GLOBAL_SOURCE,
    });
    expect(r.module).not.toBeNull();
    expect(r.module?.agent).toBeUndefined();
    expect(r.diagnostics).toEqual([]);
  });

  it("project: non-string (e.g. 42) is still a hard-fail", () => {
    const r = parseModule({
      id: "sample",
      frontmatter: fmBase({ project: 42 }),
      source: GLOBAL_SOURCE,
    });
    expect(r.module).toBeNull();
    expect(r.diagnostics[0].code).toBe("malformed-frontmatter");
    expect(r.diagnostics[0].extra?.field).toBe("project");
  });

  it("vars-level diagnostics do not disqualify the module", () => {
    const r = parseModule({
      id: "sample",
      frontmatter: fmBase({ vars: ["valid", 42, "another"] }),
      source: GLOBAL_SOURCE,
    });
    expect(r.module).not.toBeNull();
    expect(r.module?.vars).toEqual([
      { kind: "bare", name: "valid" },
      { kind: "bare", name: "another" },
    ]);
    expect(r.diagnostics.length).toBeGreaterThan(0);
    expect(r.diagnostics.every((d) => d.code === "malformed-frontmatter")).toBe(true);
    // Vars diagnostics carry the moduleId + path injected by parseModule.
    expect(r.diagnostics[0].moduleId).toBe("sample");
    expect(r.diagnostics[0].extra?.path).toBe(GLOBAL_SOURCE.path);
  });
});

describe("parseModule lazy + description (OP-192)", () => {
  const baseFm = { id: "m", title: "M", type: "workflow-module", scope: "kickoff" };
  const src = { kind: "global" as const, path: "Projects/_op-modules/m.md" };

  it("defaults lazy to false and description to undefined", () => {
    const r = parseModule({ id: "m", frontmatter: { ...baseFm }, source: src });
    expect(r.module).not.toBeNull();
    expect(r.module!.lazy).toBe(false);
    expect(r.module!.description).toBeUndefined();
  });

  it("accepts lazy: true and a string description", () => {
    const r = parseModule({
      id: "m",
      frontmatter: { ...baseFm, lazy: true, description: "tmux gotchas catalog" },
      source: src,
    });
    expect(r.module!.lazy).toBe(true);
    expect(r.module!.description).toBe("tmux gotchas catalog");
  });

  it("rejects non-boolean lazy without coercion (still loadable)", () => {
    const r = parseModule({ id: "m", frontmatter: { ...baseFm, lazy: "true" }, source: src });
    expect(r.module).toBeNull();
    expect(r.diagnostics.some(d => d.code === "malformed-frontmatter" && /lazy/.test(d.message))).toBe(true);
  });

  it("rejects non-string description", () => {
    const r = parseModule({ id: "m", frontmatter: { ...baseFm, description: 42 }, source: src });
    expect(r.module).toBeNull();
    expect(r.diagnostics.some(d => d.code === "malformed-frontmatter" && /description/.test(d.message))).toBe(true);
  });
});

describe("validateIntraScopeCollisions", () => {
  function module(
    id: string,
    scope: string,
    varNames: string[],
    source: ModuleSource = GLOBAL_SOURCE,
  ): WorkflowModule {
    return {
      id,
      title: id,
      scope,
      project: undefined,
      agent: undefined,
      order: 0,
      lazy: false,
      vars: varNames.map((n) => ({ kind: "bare", name: n })),
      source,
    };
  }

  it("no collisions when all (scope, varName) pairs are unique", () => {
    const diags = validateIntraScopeCollisions([
      module("a", "pre-commit", ["x", "y"]),
      module("b", "pre-commit", ["z"]),
      module("c", "pre-merge", ["x"]),
    ]);
    expect(diags).toEqual([]);
  });

  it("flags collision across two modules at the same scope", () => {
    const diags = validateIntraScopeCollisions([
      module("a", "pre-commit", ["x"]),
      module("b", "pre-commit", ["x"]),
    ]);
    expect(diags).toHaveLength(1);
    expect(diags[0].code).toBe("intra-scope-collision");
    expect(diags[0].varName).toBe("x");
    expect(diags[0].extra?.scope).toBe("pre-commit");
    expect(diags[0].extra?.moduleIds).toEqual(["a", "b"]);
  });

  it("flags 3-way collision and lists module ids in stable order", () => {
    const diags = validateIntraScopeCollisions([
      module("c", "pre-commit", ["x"]),
      module("a", "pre-commit", ["x"]),
      module("b", "pre-commit", ["x"]),
    ]);
    expect(diags).toHaveLength(1);
    expect(diags[0].extra?.moduleIds).toEqual(["a", "b", "c"]);
  });

  it("does not collide across different scopes", () => {
    const diags = validateIntraScopeCollisions([
      module("a", "pre-commit", ["x"]),
      module("b", "post-commit", ["x"]),
    ]);
    expect(diags).toEqual([]);
  });

  it("emits one diagnostic per colliding var, not per module", () => {
    const diags = validateIntraScopeCollisions([
      module("a", "pre-commit", ["x", "y"]),
      module("b", "pre-commit", ["x", "y"]),
    ]);
    expect(diags).toHaveLength(2);
    const names = diags.map((d) => d.varName).sort();
    expect(names).toEqual(["x", "y"]);
  });
});
