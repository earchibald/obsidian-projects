import type { LifecycleEvent, LifecycleEventKind } from "./types";

/**
 * Handler invoked synchronously by {@link EventBus.emit}. Return value is
 * ignored; if the handler needs to do async work it should fire-and-forget
 * (`void somePromise`) rather than returning a promise the bus cannot await.
 */
type Handler = (ev: LifecycleEvent) => void;

/**
 * Synchronous, in-process pub/sub for issue lifecycle events.
 *
 * Lifecycle and contract:
 *  - **Ownership.** One bus per plugin instance, created in `OpPlugin.onload`
 *    and cleared in `onunload`. Never construct a second bus or reuse one
 *    across reloads — it holds references to handlers that close over the
 *    old plugin instance.
 *  - **Registration.** Call {@link on} with a concrete `LifecycleEventKind`
 *    (e.g. `"issue:status-changed"`) or `"*"` to observe every event. The
 *    returned function removes that registration. Registering the same
 *    handler twice is a no-op (handlers are stored in a `Set`).
 *  - **Emission.** {@link emit} fans out to kind-specific handlers first,
 *    then wildcard handlers, in the order they were registered. Delivery
 *    is synchronous: when `emit` returns, every handler has run.
 *  - **Error semantics.** Handlers currently run without a try/catch wrapper
 *    — a thrown exception aborts delivery to subsequent handlers for that
 *    event. Until that changes, handlers MUST NOT throw (wrap risky work in
 *    a try/catch yourself).
 *  - **Teardown.** {@link clear} drops every registration. Any in-flight
 *    async work kicked off by a handler is NOT drained.
 */
export class EventBus {
  private handlers = new Map<LifecycleEventKind | "*", Set<Handler>>();

  /**
   * Register `handler` for `kind`. Pass `"*"` to receive every event.
   *
   * @returns An unsubscribe function; call it once to remove this specific
   *   registration. Safe to call more than once (subsequent calls are no-ops).
   */
  on(kind: LifecycleEventKind | "*", handler: Handler): () => void {
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
   * registration order.
   *
   * @throws Whatever a handler throws; delivery to remaining handlers is
   *   abandoned. See the class docstring for the no-throw contract.
   */
  emit(ev: LifecycleEvent): void {
    this.handlers.get(ev.kind)?.forEach((h) => h(ev));
    this.handlers.get("*")?.forEach((h) => h(ev));
  }

  /** Drop every registration. Intended for plugin `onunload`. */
  clear(): void {
    this.handlers.clear();
  }
}
