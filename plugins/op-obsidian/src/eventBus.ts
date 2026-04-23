import type { LifecycleEvent, LifecycleEventKind } from "./types";

/**
 * Handler invoked synchronously by {@link EventBus.emit}. A handler may
 * return a promise; the bus tracks it so {@link EventBus.close} can drain
 * in-flight async work on unload. Returning `void` (or firing work with
 * `void somePromise`) remains supported — such work simply isn't drained.
 */
type Handler = (ev: LifecycleEvent) => void | Promise<unknown>;

/**
 * Synchronous, in-process pub/sub for issue lifecycle events.
 *
 * Lifecycle and contract:
 *  - **Ownership.** One bus per plugin instance, created in `OpPlugin.onload`
 *    and closed in `onunload`. Never construct a second bus or reuse one
 *    across reloads — it holds references to handlers that close over the
 *    old plugin instance.
 *  - **Registration.** Call {@link on} with a concrete `LifecycleEventKind`
 *    (e.g. `"issue:status-changed"`) or `"*"` to observe every event. The
 *    returned function removes that registration. Registering the same
 *    handler twice is a no-op (handlers are stored in a `Set`). After
 *    {@link close}, `on` is a no-op and returns a no-op unsubscribe.
 *  - **Emission.** {@link emit} fans out to kind-specific handlers first,
 *    then wildcard handlers, in the order they were registered. Delivery
 *    is synchronous: when `emit` returns, every handler has run. After
 *    {@link close}, `emit` is a no-op.
 *  - **Error semantics.** Each handler runs inside a try/catch; a thrown
 *    exception is logged via `console.error` and delivery continues to
 *    subsequent handlers. Async rejections from handlers that return a
 *    promise are likewise logged and swallowed so one bad handler cannot
 *    poison drain.
 *  - **Teardown.** {@link close} flips a "sealed" flag so no further events
 *    are emitted and no new registrations are accepted, awaits any
 *    promises returned by handlers during prior emits, then drops every
 *    registration. Handlers that use the `void somePromise` fire-and-forget
 *    pattern are NOT drained — return the promise if teardown safety
 *    matters for that handler.
 */
export class EventBus {
  private handlers = new Map<LifecycleEventKind | "*", Set<Handler>>();
  private pending = new Set<Promise<unknown>>();
  private sealed = false;

  /**
   * Register `handler` for `kind`. Pass `"*"` to receive every event.
   *
   * @returns An unsubscribe function; call it once to remove this specific
   *   registration. Safe to call more than once (subsequent calls are no-ops).
   *   If the bus is already sealed, returns a no-op unsubscribe and does not
   *   register the handler.
   */
  on(kind: LifecycleEventKind | "*", handler: Handler): () => void {
    if (this.sealed) return () => {};
    let set = this.handlers.get(kind);
    if (!set) {
      set = new Set();
      this.handlers.set(kind, set);
    }
    set.add(handler);
    return () => set!.delete(handler);
  }

  /**
   * Deliver `ev` to every registered handler synchronously. Kind-specific
   * handlers run first, then wildcard (`"*"`) handlers. Handlers run in
   * registration order. Exceptions and async rejections are caught and
   * logged; they never interrupt delivery.
   */
  emit(ev: LifecycleEvent): void {
    if (this.sealed) return;
    this.handlers.get(ev.kind)?.forEach((h) => this.invoke(h, ev));
    this.handlers.get("*")?.forEach((h) => this.invoke(h, ev));
  }

  private invoke(h: Handler, ev: LifecycleEvent): void {
    let result: void | Promise<unknown>;
    try {
      result = h(ev);
    } catch (err) {
      console.error("[op-obsidian] event handler threw", ev.kind, err);
      return;
    }
    if (result && typeof (result as Promise<unknown>).then === "function") {
      const p = (result as Promise<unknown>).catch((err) => {
        console.error("[op-obsidian] event handler rejected", ev.kind, err);
      });
      this.pending.add(p);
      void p.finally(() => this.pending.delete(p));
    }
  }

  /**
   * Seal the bus, await any in-flight promises returned by handlers, and
   * drop every registration. After `close` returns, `emit` and `on` are
   * no-ops. Safe to call more than once.
   */
  async close(): Promise<void> {
    this.sealed = true;
    if (this.pending.size > 0) {
      await Promise.all(Array.from(this.pending));
    }
    this.handlers.clear();
  }

  /**
   * Drop every registration without sealing or draining. Intended for tests
   * that want to reuse a bus instance across cases.
   */
  clear(): void {
    this.handlers.clear();
  }
}
