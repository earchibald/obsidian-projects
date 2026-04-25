import { describe, it, expect, vi } from "vitest";

vi.mock("obsidian", () => {
  class TFile {
    path = "";
    basename = "";
    name = "";
  }
  return { TFile };
});

import { TFile } from "obsidian";
import { listLinkedTargets } from "./links";
import type { IssueEntry } from "./types";
import type { IssueStore } from "./issueStore";

function entry(id: string): IssueEntry {
  return {
    path: `Projects/demo/ISSUES/${id} t.md`,
    type: "issue",
    id,
    project: "demo",
    status: "open",
    title: `${id} t`,
    resolvedFolder: false,
  };
}

function makeEnv(opts: {
  src: IssueEntry;
  fm: Record<string, unknown>;
  others: IssueEntry[];
}) {
  const byPath = new Map<string, IssueEntry>();
  const byIdMap = new Map<string, IssueEntry>();
  for (const e of [opts.src, ...opts.others]) {
    byPath.set(e.path, e);
    byIdMap.set(e.id, e);
  }
  const fileFor = (e: IssueEntry) =>
    Object.assign(new TFile(), { path: e.path, basename: e.id, name: `${e.id}.md` });
  const app = {
    vault: {
      getAbstractFileByPath: (p: string) => {
        const e = byPath.get(p);
        return e ? fileFor(e) : null;
      },
    },
    metadataCache: {
      getFileCache: (f: TFile) => {
        if (f.path === opts.src.path) return { frontmatter: opts.fm };
        return { frontmatter: {} };
      },
    },
  };
  const store = {
    byId: (id: string) => byIdMap.get(id),
    issues: () => [opts.src, ...opts.others],
    tasks: () => [],
  } as unknown as IssueStore;
  return { app: app as any, store };
}

describe("listLinkedTargets", () => {
  it("reads a list relation (children) and resolves to IssueEntry rows", () => {
    const src = entry("OP-1");
    const c1 = entry("OP-2");
    const c2 = entry("OP-3");
    const { app, store } = makeEnv({
      src,
      fm: { children: ["OP-2", "OP-3"] },
      others: [c1, c2],
    });
    const out = listLinkedTargets(app, store, "OP-1", "children");
    expect(out.map((e) => e.id)).toEqual(["OP-2", "OP-3"]);
  });

  it("reads a scalar relation (parent) and returns a single-element list", () => {
    const src = entry("OP-1");
    const p = entry("OP-9");
    const { app, store } = makeEnv({
      src,
      fm: { parent: "OP-9" },
      others: [p],
    });
    const out = listLinkedTargets(app, store, "OP-1", "parent");
    expect(out.map((e) => e.id)).toEqual(["OP-9"]);
  });

  it("returns [] when the source has no entry under that relation", () => {
    const src = entry("OP-1");
    const { app, store } = makeEnv({ src, fm: {}, others: [] });
    expect(listLinkedTargets(app, store, "OP-1", "children")).toEqual([]);
    expect(listLinkedTargets(app, store, "OP-1", "parent")).toEqual([]);
  });

  it("drops link entries whose target id no longer resolves", () => {
    const src = entry("OP-1");
    const live = entry("OP-2");
    const { app, store } = makeEnv({
      src,
      fm: { children: ["OP-2", "OP-404"] },
      others: [live],
    });
    const out = listLinkedTargets(app, store, "OP-1", "children");
    expect(out.map((e) => e.id)).toEqual(["OP-2"]);
  });

  it("returns [] when the source id itself is unknown", () => {
    const src = entry("OP-1");
    const { app, store } = makeEnv({ src, fm: { children: ["OP-2"] }, others: [] });
    expect(listLinkedTargets(app, store, "OP-999", "children")).toEqual([]);
  });

  it("throws on an unknown relation name (consistent with validateLinkArgs)", () => {
    const src = entry("OP-1");
    const { app, store } = makeEnv({ src, fm: {}, others: [] });
    expect(() => listLinkedTargets(app, store, "OP-1", "not_a_relation")).toThrow(
      /Unknown relation/,
    );
  });
});
