import { iterm2 } from "./proto/api.generated";
import { createUnixWebSocket } from "./unixWebSocket";

// Persistent WebSocket+protobuf transport against iTerm2's local API.
//
// Wire protocol (documented at https://iterm2.com/python-api/websockets.html):
//   - URL:          ws+unix://<socketPath>/  (iTerm 3.6+ uses a unix socket;
//                   pre-3.6 used a local TCP port — we only support 3.6+)
//   - Subprotocol:  api.iterm2.com
//   - Headers:      x-iterm2-library-version: op-obsidian <ver>
//                   x-iterm2-cookie: <cookie>
//                   x-iterm2-key:    <key>
//                   origin:          ws://localhost
//   - Frames:       binary ClientOriginatedMessage / ServerOriginatedMessage
//   - Multiplex:    each request carries a monotonically increasing u32 id;
//                   the response echoes the same id.
//
// Obsidian's renderer has Node available (`require("net")`), so we hand-roll
// the WebSocket handshake and framing over a unix-socket `net.Socket` in
// `unixWebSocket.ts`. This avoids a bundled `ws` dep and works inside the
// renderer where the global `WebSocket` class can't speak unix sockets.
// Node-only unit tests inject a shim via the factory hook below.

export type WebSocketFactory = (
  socketPath: string,
  protocol: string,
  headers: Record<string, string>,
) => WebSocketLike;

export interface WebSocketLike {
  send(data: ArrayBuffer | Uint8Array): void;
  close(code?: number, reason?: string): void;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: ArrayBuffer | Uint8Array | Blob }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onclose: ((ev: { code: number; reason: string }) => void) | null;
}

export interface TransportOptions {
  socketPath: string;
  cookie: string;
  key: string;
  appName: string;
  version: string;
  wsFactory?: WebSocketFactory;
}

interface PendingRpc {
  resolve: (msg: iterm2.ServerOriginatedMessage) => void;
  reject: (err: Error) => void;
}

export class ITermTransport {
  private ws: WebSocketLike | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, PendingRpc>();
  private readonly opts: TransportOptions;
  private connectPromise: Promise<void> | null = null;
  private closed = false;

  constructor(opts: TransportOptions) {
    this.opts = opts;
  }

  async connect(): Promise<void> {
    if (this.connectPromise) return this.connectPromise;
    this.connectPromise = this.openSocket();
    return this.connectPromise;
  }

  // Send a ClientOriginatedMessage and resolve with the matching
  // ServerOriginatedMessage. Caller is responsible for inspecting the
  // `response` oneof to pull out the specific submessage it issued.
  async request(msg: iterm2.IClientOriginatedMessage): Promise<iterm2.ServerOriginatedMessage> {
    if (!this.ws) throw new Error("op: ITermTransport.request before connect()");
    const id = this.nextId++;
    const framed = iterm2.ClientOriginatedMessage.encode({ ...msg, id }).finish();
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      try {
        this.ws!.send(framed);
      } catch (err) {
        this.pending.delete(id);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  close(): void {
    this.closed = true;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // best-effort
      }
      this.ws = null;
    }
    for (const [, pending] of this.pending) {
      pending.reject(new Error("op: iTerm transport closed"));
    }
    this.pending.clear();
  }

  private async openSocket(): Promise<void> {
    const factory = this.opts.wsFactory ?? defaultWebSocketFactory;
    const headers: Record<string, string> = {
      "x-iterm2-library-version": `${this.opts.appName} ${this.opts.version}`,
      "x-iterm2-cookie": this.opts.cookie,
      "x-iterm2-key": this.opts.key,
      origin: "ws://localhost",
    };
    const ws = factory(this.opts.socketPath, "api.iterm2.com", headers);
    this.ws = ws;
    ws.onmessage = (ev) => {
      void this.handleFrame(ev.data);
    };
    ws.onclose = () => {
      if (!this.closed) {
        for (const [, pending] of this.pending) {
          pending.reject(new Error("op: iTerm websocket closed unexpectedly"));
        }
        this.pending.clear();
        this.ws = null;
        this.connectPromise = null;
      }
    };
    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = (ev) => {
        const detail =
          ev && typeof ev === "object" && "message" in ev
            ? String((ev as { message: unknown }).message)
            : "";
        reject(
          new Error(
            `op: iTerm websocket failed to open${detail ? ` (${detail})` : ""} — is 'Enable Python API' turned on in iTerm2 > Settings > General > Magic, and is iTerm2 running?`,
          ),
        );
      };
    });
  }

  private async handleFrame(data: ArrayBuffer | Uint8Array | Blob): Promise<void> {
    const bytes = await toBytes(data);
    const msg = iterm2.ServerOriginatedMessage.decode(bytes);
    const id = typeof msg.id === "number" ? msg.id : Number(msg.id);
    const pending = this.pending.get(id);
    if (!pending) return;
    this.pending.delete(id);
    pending.resolve(msg);
  }
}

async function toBytes(data: ArrayBuffer | Uint8Array | Blob): Promise<Uint8Array> {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  // Browser/Electron Blob path.
  const buf = await (data as Blob).arrayBuffer();
  return new Uint8Array(buf);
}

const defaultWebSocketFactory: WebSocketFactory = (socketPath, protocol, headers) => {
  return createUnixWebSocket({ socketPath, protocol, headers });
};
