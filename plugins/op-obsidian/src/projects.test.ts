import { describe, it, expect } from "vitest";
import { applyProjectOrder, type ProjectInfo } from "./projects";

const p = (slug: string): ProjectInfo => ({ slug, statusPath: `Projects/${slug}/STATUS.md` });

describe("applyProjectOrder", () => {
  it("sorts lexically when order is empty", () => {
    expect(applyProjectOrder([p("c"), p("a"), p("b")], []).map((x) => x.slug)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("places ordered slugs first, in the given order", () => {
    expect(
      applyProjectOrder([p("a"), p("b"), p("c")], ["c", "a"]).map((x) => x.slug),
    ).toEqual(["c", "a", "b"]);
  });

  it("appends unordered slugs lexically at the tail", () => {
    expect(
      applyProjectOrder([p("z"), p("y"), p("x")], ["x"]).map((x) => x.slug),
    ).toEqual(["x", "y", "z"]);
  });

  it("ignores order entries that don't match any project", () => {
    expect(
      applyProjectOrder([p("a"), p("b")], ["ghost", "b", "phantom"]).map((x) => x.slug),
    ).toEqual(["b", "a"]);
  });

  it("falls back to lexical when no order entry matches", () => {
    expect(
      applyProjectOrder([p("c"), p("a"), p("b")], ["ghost"]).map((x) => x.slug),
    ).toEqual(["a", "b", "c"]);
  });

  it("does not mutate the input arrays", () => {
    const projects = [p("c"), p("a"), p("b")];
    const order = ["a"];
    const before = projects.map((x) => x.slug);
    const orderBefore = [...order];
    applyProjectOrder(projects, order);
    expect(projects.map((x) => x.slug)).toEqual(before);
    expect(order).toEqual(orderBefore);
  });

  it("handles duplicate order entries by keeping the first rank", () => {
    expect(
      applyProjectOrder([p("a"), p("b"), p("c")], ["b", "a", "b"]).map((x) => x.slug),
    ).toEqual(["b", "a", "c"]);
  });
});
