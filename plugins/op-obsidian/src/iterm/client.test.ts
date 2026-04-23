import { describe, expect, it } from "vitest";
import { findSessionId } from "./client";
import { iterm2 } from "./proto/api.generated";

// findSessionId walks the ListSessionsResponse tree (windows → tabs →
// SplitTreeNode recursion + minimized + buried). The proto is annoying enough
// that the parser is the bug-prone bit; the network round-trip is tested
// against a real iTerm during smoke. These tests cover the parser shape only.
describe("client.findSessionId", () => {
  it("finds a session nested inside a split tree", () => {
    const reply = iterm2.ListSessionsResponse.create({
      windows: [
        {
          windowId: "w1",
          tabs: [
            {
              tabId: "t1",
              root: {
                vertical: true,
                links: [
                  { session: { uniqueIdentifier: "left" } },
                  {
                    node: {
                      vertical: false,
                      links: [
                        { session: { uniqueIdentifier: "top-right" } },
                        { session: { uniqueIdentifier: "bottom-right" } },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    expect(findSessionId(reply, "left")).toBe(true);
    expect(findSessionId(reply, "top-right")).toBe(true);
    expect(findSessionId(reply, "bottom-right")).toBe(true);
    expect(findSessionId(reply, "missing")).toBe(false);
  });

  it("finds a buried session", () => {
    const reply = iterm2.ListSessionsResponse.create({
      buriedSessions: [{ uniqueIdentifier: "buried-1" }],
    });
    expect(findSessionId(reply, "buried-1")).toBe(true);
    expect(findSessionId(reply, "buried-2")).toBe(false);
  });

  it("finds a minimized session", () => {
    const reply = iterm2.ListSessionsResponse.create({
      windows: [
        {
          tabs: [
            {
              tabId: "t1",
              minimizedSessions: [{ uniqueIdentifier: "min-1" }],
            },
          ],
        },
      ],
    });
    expect(findSessionId(reply, "min-1")).toBe(true);
  });

  it("returns false on an empty reply", () => {
    const reply = iterm2.ListSessionsResponse.create({});
    expect(findSessionId(reply, "anything")).toBe(false);
  });
});
