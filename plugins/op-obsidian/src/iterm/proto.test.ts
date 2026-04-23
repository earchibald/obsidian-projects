import { describe, expect, it } from "vitest";
import { iterm2 } from "./proto/api.generated";

// Round-trip sanity: we can encode a ClientOriginatedMessage with one of the
// submessages the orchestrator will use (ListSessionsRequest), decode it back,
// and observe the oneof survives. This guards against a broken vendored proto
// without needing a live iTerm connection.
describe("iterm proto round-trip", () => {
  it("encodes and decodes a ListSessionsRequest", () => {
    const msg = iterm2.ClientOriginatedMessage.create({
      id: 42,
      listSessionsRequest: iterm2.ListSessionsRequest.create({}),
    });
    const wire = iterm2.ClientOriginatedMessage.encode(msg).finish();
    const back = iterm2.ClientOriginatedMessage.decode(wire);
    expect(Number(back.id)).toBe(42);
    expect(back.listSessionsRequest).toBeTruthy();
    expect(back.submessage).toBe("listSessionsRequest");
  });

  it("encodes and decodes a SplitPaneRequest with a command customization", () => {
    const msg = iterm2.ClientOriginatedMessage.create({
      id: 7,
      splitPaneRequest: iterm2.SplitPaneRequest.create({
        session: "active",
        splitDirection: iterm2.SplitPaneRequest.SplitDirection.VERTICAL,
        customProfileProperties: [
          iterm2.ProfileProperty.create({
            key: "Command",
            jsonValue: JSON.stringify("bash -lc 'echo hi'"),
          }),
        ],
      }),
    });
    const wire = iterm2.ClientOriginatedMessage.encode(msg).finish();
    const back = iterm2.ClientOriginatedMessage.decode(wire);
    expect(back.submessage).toBe("splitPaneRequest");
    expect(back.splitPaneRequest?.session).toBe("active");
    expect(back.splitPaneRequest?.splitDirection).toBe(
      iterm2.SplitPaneRequest.SplitDirection.VERTICAL,
    );
    expect(back.splitPaneRequest?.customProfileProperties?.[0]?.key).toBe("Command");
    expect(back.splitPaneRequest?.customProfileProperties?.[0]?.jsonValue).toBe(
      JSON.stringify("bash -lc 'echo hi'"),
    );
  });
});
