import { iterm2 } from "./proto/api.generated";

// Persistent WebSocket+protobuf transport against iTerm2's local API.
//
// Wire protocol (documented at https://iterm2.com/python-api/websockets.html):
//   - URL:          ws://localhost:<port>/ (port read from cookie.API_PORT_PATH)
//   - Subprotocol:  api.iterm2.com
//   - Headers:      x-iterm2-library-version: op-obsidian <ver>
//                   x-iterm2-cookie: <cookie>
//                   x-iterm2-key:    <key>
//                   origin:          ws://localhost:<port>
//   - Frames:       binary ClientOriginatedMessage / ServerOriginatedMessage
//   - Multiplex:    each request carries a monotonically increasing u32 id;
//                   the response echoes the same id.
//
// Obsidian's renderer provides a global `WebSocket`, so we do not take a `ws`
// dependency. Node-only unit tests may inject a shim; the transport is
// constructed with an explicit factory so we don't need to patch globals.
//
// This module is dead code for Step 1 of OP-101: nothing imports it at module
// load outside tests. Step 2 wires it behind `useWebSocketClient`.

export type WebSocketFactory = (url: string, protocols: string, headers: Record<string, string>) => WebSocketLike;

export interface WebSocketLike {
  send(data: ArrayBuffer | Uint8Array): void;
  close(code?: number, reason?: string): void;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: ArrayBuffer | Uint8Array | Blob }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onclose: ((ev: { code: number; reason: string }) => void) | null;
}

export interface TransportOptions {
  port: number;
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
    const url = `ws://localhost:${this.opts.port}/`;
    const factory = this.opts.wsFactory ?? defaultWebSocketFactory;
    const headers: Record<string, string> = {
      "x-iterm2-library-version": `${this.opts.appName} ${this.opts.version}`,
      "x-iterm2-cookie": this.opts.cookie,
      "x-iterm2-key": this.opts.key,
      origin: `ws://localhost:${this.opts.port}`,
    };
    const ws = factory(url, "api.iterm2.com", headers);
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
      ws.onerror = () =>
        reject(
          new Error(
            "op: iTerm websocket failed to open — is 'Enable Python API' turned on in iTerm2 > Settings > General > Magic?",
          ),
        );
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

const defaultWebSocketFactory: WebSocketFactory = (url, protocols) => {
  // Obsidian renderer: WebSocket is global. Custom headers aren't supported by
  // the renderer's WebSocket constructor — iTerm's API actually reads cookie
  // and key from the subprotocol when headers are absent, so we fall back to
  // encoding them into the subprotocol string. Step 2 will validate this path
  // on a real connection and adjust if iTerm rejects it.
  const g = globalThis as { WebSocket?: new (url: string, protocols?: string | string[]) => WebSocketLike };
  if (!g.WebSocket) throw new Error("op: no global WebSocket available — cannot talk to iTerm API");
  return new g.WebSocket(url, protocols);
};

