import { describe, expect, it } from "vitest";
import {
  buildHandshakeRequest,
  decodeFrame,
  encodeClientFrame,
  parseHandshakeResponse,
} from "./unixWebSocket";

describe("unixWebSocket handshake", () => {
  it("builds a valid RFC 6455 upgrade request", () => {
    const req = buildHandshakeRequest({
      protocol: "api.iterm2.com",
      key: "AAAAAAAAAAAAAAAAAAAAAA==",
      headers: { "x-iterm2-cookie": "c", "x-iterm2-key": "k" },
    }).toString("ascii");
    expect(req).toMatch(/^GET \/ HTTP\/1\.1\r\n/);
    expect(req).toContain("Upgrade: websocket\r\n");
    expect(req).toContain("Connection: Upgrade\r\n");
    expect(req).toContain("Sec-WebSocket-Version: 13\r\n");
    expect(req).toContain("Sec-WebSocket-Protocol: api.iterm2.com\r\n");
    expect(req).toContain("x-iterm2-cookie: c\r\n");
    expect(req.endsWith("\r\n\r\n")).toBe(true);
  });

  it("parses a 101 upgrade response", () => {
    const parsed = parseHandshakeResponse(
      "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nSec-WebSocket-Accept: abc=",
    );
    expect(parsed.status).toBe(101);
    expect(parsed.statusText).toBe("Switching Protocols");
    expect(parsed.accept).toBe("abc=");
  });

  it("surfaces non-101 status", () => {
    const parsed = parseHandshakeResponse("HTTP/1.1 401 Unauthorized\r\n");
    expect(parsed.status).toBe(401);
    expect(parsed.statusText).toBe("Unauthorized");
  });
});

describe("unixWebSocket framing", () => {
  it("round-trips a short binary frame through encode → unmask → decode", () => {
    const payload = Buffer.from([1, 2, 3, 4, 5]);
    const encoded = encodeClientFrame(0x2, payload);
    // Client-encoded frames are masked. Decode them via the shared decoder,
    // which unmasks in place.
    const decoded = decodeFrame(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.opcode).toBe(0x2);
    expect(decoded!.fin).toBe(true);
    expect(Buffer.from(decoded!.payload).equals(payload)).toBe(true);
    expect(decoded!.consumed).toBe(encoded.length);
  });

  it("round-trips a medium-length frame (16-bit length field)", () => {
    const payload = Buffer.alloc(200, 0x7f);
    const encoded = encodeClientFrame(0x2, payload);
    const decoded = decodeFrame(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.payload.length).toBe(200);
    expect(decoded!.payload.every((b) => b === 0x7f)).toBe(true);
  });

  it("round-trips a large frame (64-bit length field)", () => {
    const payload = Buffer.alloc(0x10000 + 1, 0x42);
    const encoded = encodeClientFrame(0x2, payload);
    const decoded = decodeFrame(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.payload.length).toBe(payload.length);
  });

  it("returns null when the buffer doesn't hold a full frame yet", () => {
    const payload = Buffer.from([1, 2, 3, 4, 5]);
    const encoded = encodeClientFrame(0x2, payload);
    expect(decodeFrame(encoded.slice(0, encoded.length - 1))).toBeNull();
  });

  it("decodes an unmasked server frame (as iTerm would send)", () => {
    const payload = Buffer.from([0xaa, 0xbb, 0xcc]);
    const frame = Buffer.concat([Buffer.from([0x82, payload.length]), payload]);
    const decoded = decodeFrame(frame);
    expect(decoded).not.toBeNull();
    expect(decoded!.opcode).toBe(0x2);
    expect(Buffer.from(decoded!.payload).equals(payload)).toBe(true);
  });

  it("reports close frame with code and reason", () => {
    const reason = Buffer.from("bye", "utf8");
    const payload = Buffer.concat([Buffer.from([0x03, 0xe9]), reason]); // 1001
    const frame = Buffer.concat([Buffer.from([0x88, payload.length]), payload]);
    const decoded = decodeFrame(frame);
    expect(decoded!.opcode).toBe(0x8);
    expect(decoded!.payload.readUInt16BE(0)).toBe(1001);
  });
});
