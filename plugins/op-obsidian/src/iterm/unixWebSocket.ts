import { createConnection, type Socket } from "net";
import { createHash, randomBytes } from "crypto";
import type { WebSocketLike } from "./transport";

// Minimal WebSocket client (RFC 6455) over a Node unix-domain socket.
//
// Why hand-rolled: Obsidian's renderer global `WebSocket` only speaks
// `ws://host:port`, and iTerm2 3.6+ moved the Python API from a TCP port to a
// unix socket at `~/Library/Application Support/iTerm2/private/socket`. We
// avoid the `ws` npm dep so the plugin stays zero-runtime-deps. Scope is
// intentionally narrow:
//
//  - binary frames only (opcode 0x2), no text
//  - no fragmentation on send (iTerm messages fit in a single frame)
//  - handles inbound continuation frames + unfragmented binary frames
//  - responds to ping (0x9) with pong (0xA); ignores pong
//  - close (0x8) surfaces via `onclose`
//
// iTerm2's API speaks single-frame binary messages that are plenty small
// (protobuf replies under a few KB), so this is sufficient. If a future
// server-pushed notification ever exceeds 64KB, the continuation path below
// covers it.

const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

export interface UnixWebSocketOptions {
  socketPath: string;
  protocol: string;
  headers: Record<string, string>;
}

export function createUnixWebSocket(opts: UnixWebSocketOptions): WebSocketLike {
  return new UnixWebSocket(opts);
}

class UnixWebSocket implements WebSocketLike {
  onopen: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: { data: ArrayBuffer | Uint8Array | Blob }) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onclose: ((ev: { code: number; reason: string }) => void) | null = null;

  private readonly socket: Socket;
  private handshakeDone = false;
  private closed = false;
  private buffer: Buffer = Buffer.alloc(0);
  private fragments: Buffer[] | null = null;
  private readonly expectedAccept: string;

  constructor(opts: UnixWebSocketOptions) {
    const key = randomBytes(16).toString("base64");
    this.expectedAccept = createHash("sha1").update(key + WS_GUID).digest("base64");

    const req = buildHandshakeRequest({
      protocol: opts.protocol,
      key,
      headers: opts.headers,
    });

    this.socket = createConnection(opts.socketPath);
    this.socket.on("connect", () => {
      this.socket.write(req);
    });
    this.socket.on("data", (chunk: Buffer) => this.onData(chunk));
    this.socket.on("error", (err: Error) => {
      if (!this.closed) this.onerror?.(err);
      this.teardown(1006, err.message);
    });
    this.socket.on("close", () => this.teardown(1006, "socket closed"));
  }

  send(data: ArrayBuffer | Uint8Array): void {
    if (!this.handshakeDone) throw new Error("op: unix WebSocket send before handshake complete");
    const payload = data instanceof Uint8Array ? Buffer.from(data) : Buffer.from(new Uint8Array(data));
    this.socket.write(encodeClientFrame(0x2, payload));
  }

  close(code = 1000, reason = ""): void {
    if (this.closed) return;
    try {
      if (this.handshakeDone) {
        const payload = Buffer.alloc(2 + Buffer.byteLength(reason));
        payload.writeUInt16BE(code, 0);
        if (reason) payload.write(reason, 2);
        this.socket.write(encodeClientFrame(0x8, payload));
      }
    } catch {
      // best-effort
    }
    this.teardown(code, reason);
  }

  private teardown(code: number, reason: string): void {
    if (this.closed) return;
    this.closed = true;
    try {
      this.socket.destroy();
    } catch {
      // ignore
    }
    this.onclose?.({ code, reason });
  }

  private onData(chunk: Buffer): void {
    this.buffer = this.buffer.length === 0 ? chunk : Buffer.concat([this.buffer, chunk]);
    if (!this.handshakeDone) {
      const end = this.buffer.indexOf("\r\n\r\n");
      if (end === -1) return;
      const headerText = this.buffer.slice(0, end).toString("ascii");
      this.buffer = this.buffer.slice(end + 4);
      const parsed = parseHandshakeResponse(headerText);
      if (parsed.status !== 101) {
        const err = new Error(
          `op: iTerm WebSocket handshake failed with HTTP ${parsed.status} ${parsed.statusText}`,
        );
        this.onerror?.(err);
        this.teardown(1002, err.message);
        return;
      }
      if (parsed.accept !== this.expectedAccept) {
        const err = new Error("op: iTerm WebSocket handshake failed — Sec-WebSocket-Accept mismatch");
        this.onerror?.(err);
        this.teardown(1002, err.message);
        return;
      }
      this.handshakeDone = true;
      this.onopen?.({});
    }

    while (this.buffer.length > 0) {
      const frame = decodeFrame(this.buffer);
      if (!frame) return;
      this.buffer = this.buffer.slice(frame.consumed);
      this.handleFrame(frame);
    }
  }

  private handleFrame(frame: DecodedFrame): void {
    if (frame.opcode === 0x8) {
      const code = frame.payload.length >= 2 ? frame.payload.readUInt16BE(0) : 1005;
      const reason = frame.payload.length > 2 ? frame.payload.slice(2).toString("utf8") : "";
      this.teardown(code, reason);
      return;
    }
    if (frame.opcode === 0x9) {
      this.socket.write(encodeClientFrame(0xa, frame.payload));
      return;
    }
    if (frame.opcode === 0xa) {
      return;
    }
    if (frame.opcode === 0x2 || frame.opcode === 0x1) {
      if (frame.fin && this.fragments === null) {
        this.onmessage?.({ data: new Uint8Array(frame.payload) });
        return;
      }
      this.fragments = [frame.payload];
      return;
    }
    if (frame.opcode === 0x0) {
      if (this.fragments === null) return;
      this.fragments.push(frame.payload);
      if (frame.fin) {
        const full = Buffer.concat(this.fragments);
        this.fragments = null;
        this.onmessage?.({ data: new Uint8Array(full) });
      }
      return;
    }
  }
}

interface HandshakeRequestArgs {
  protocol: string;
  key: string;
  headers: Record<string, string>;
}

export function buildHandshakeRequest(args: HandshakeRequestArgs): Buffer {
  const lines = [
    "GET / HTTP/1.1",
    "Host: localhost",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Key: ${args.key}`,
    "Sec-WebSocket-Version: 13",
    `Sec-WebSocket-Protocol: ${args.protocol}`,
  ];
  for (const [name, value] of Object.entries(args.headers)) {
    lines.push(`${name}: ${value}`);
  }
  lines.push("", "");
  return Buffer.from(lines.join("\r\n"), "ascii");
}

export interface ParsedHandshakeResponse {
  status: number;
  statusText: string;
  accept?: string;
}

export function parseHandshakeResponse(text: string): ParsedHandshakeResponse {
  const lines = text.split("\r\n");
  const statusLine = lines[0] ?? "";
  const m = /^HTTP\/1\.1 (\d+)(?: (.*))?$/.exec(statusLine);
  if (!m) return { status: 0, statusText: statusLine };
  const status = Number(m[1]);
  const statusText = m[2] ?? "";
  let accept: string | undefined;
  for (const line of lines.slice(1)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const name = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (name === "sec-websocket-accept") accept = value;
  }
  return { status, statusText, accept };
}

export interface DecodedFrame {
  fin: boolean;
  opcode: number;
  payload: Buffer;
  consumed: number;
}

export function decodeFrame(buf: Buffer): DecodedFrame | null {
  if (buf.length < 2) return null;
  const b0 = buf[0];
  const b1 = buf[1];
  const fin = (b0 & 0x80) !== 0;
  const opcode = b0 & 0x0f;
  const masked = (b1 & 0x80) !== 0;
  let len = b1 & 0x7f;
  let cursor = 2;
  if (len === 126) {
    if (buf.length < cursor + 2) return null;
    len = buf.readUInt16BE(cursor);
    cursor += 2;
  } else if (len === 127) {
    if (buf.length < cursor + 8) return null;
    const hi = buf.readUInt32BE(cursor);
    const lo = buf.readUInt32BE(cursor + 4);
    // iTerm won't send >4GB payloads; reject silently if hi is set.
    if (hi !== 0) throw new Error("op: iTerm WebSocket frame too large");
    len = lo;
    cursor += 8;
  }
  let maskKey: Buffer | null = null;
  if (masked) {
    if (buf.length < cursor + 4) return null;
    maskKey = buf.slice(cursor, cursor + 4);
    cursor += 4;
  }
  if (buf.length < cursor + len) return null;
  let payload = buf.slice(cursor, cursor + len);
  if (maskKey) {
    const copy = Buffer.alloc(len);
    for (let i = 0; i < len; i++) copy[i] = payload[i] ^ maskKey[i % 4];
    payload = copy;
  }
  return { fin, opcode, payload, consumed: cursor + len };
}

export function encodeClientFrame(opcode: number, payload: Buffer): Buffer {
  const len = payload.length;
  let header: Buffer;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[1] = 0x80 | len;
  } else if (len < 0x10000) {
    header = Buffer.alloc(4);
    header[1] = 0x80 | 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 0x80 | 127;
    header.writeUInt32BE(0, 2);
    header.writeUInt32BE(len, 6);
  }
  header[0] = 0x80 | (opcode & 0x0f);
  const mask = randomBytes(4);
  const masked = Buffer.alloc(len);
  for (let i = 0; i < len; i++) masked[i] = payload[i] ^ mask[i % 4];
  return Buffer.concat([header, mask, masked]);
}
