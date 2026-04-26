// Visibility-tenet contract for headless subtasks. OP-181 §"Visibility tenet —
// every step is observable" requires that whenever a workflow step internally
// invokes a headless sub-process (today's only example: `claude -p` driven by
// the evaluator) the parent surface MUST also be wired to surface progress to
// the user — a status line announcing the subtask, a streaming tail of the
// child's stdout, and an acknowledgement boundary before any vault mutation.
//
// `RelaySession` is the discriminated union that codifies this at the type
// level. `launchHeadlessSubtask` (the rename of OP-195/196's `launchHeadless`)
// requires a `relaySession: RelaySession` argument; the typechecker rejects
// callers that try to skip it. There is no `undefined` escape hatch — the
// discriminated union shape forces every caller to choose a relay variant.
//
// Two variants:
//
//   - `kind: "tmux"` — production. Status line goes to a tmux pane status row
//     (or any visible UI surface — the term is historical; today's evaluator
//     callsite uses `Notice` for the status line and `console.log` for the
//     pane stream because the evaluator runs in the Obsidian plugin process,
//     not inside a tmux pane). `target` is a freeform identifier so log lines
//     can be correlated back to a launch.
//
//   - `kind: "test"` — vitest paths. A single `capture(line)` callback
//     swallows every status-line and pane-stream event so the test can assert
//     on what the subtask emitted without spinning up a real terminal.
//
// Adding a third variant later (e.g., a no-op recorder for dry-runs) costs
// one entry in the union plus one `assertNeverRelay` exhaustiveness check.

/**
 * Discriminated union of relay surfaces a `launchHeadlessSubtask` caller can
 * supply. There is no "no relay" variant — every caller must pick one.
 */
export type RelaySession =
  | {
      kind: "tmux";
      /**
       * Freeform identifier for the relay target — typically a tmux pane id
       * (`%12`), a session/window pair (`op-agents-1:OP-197`), or a logical
       * label when no real tmux pane exists (e.g., `obsidian-plugin:OP-197`
       * for callsites that run inside the Obsidian process and surface via
       * `Notice` + `console.log`). Used in log lines and diagnostics — never
       * acted on by the relay itself.
       */
      target: string;
      /**
       * One-line status update — surfaced near the top of the relay so the
       * user sees what's happening at a glance ("running op-evaluate for
       * OP-197"). Called once at start, once at end, and once per logical
       * milestone in between.
       */
      statusLine: (line: string) => void;
      /**
       * Streaming tail of the subtask's stdout — chunks may be partial lines.
       * Production callers route this through whatever streaming surface is
       * available (a tmux pane in OP-185+, `console.log` for the evaluator
       * today). Tests don't need this — the `kind: "test"` variant collapses
       * status + stream into a single `capture` callback.
       */
      paneStream: (chunk: string) => void;
    }
  | {
      kind: "test";
      /**
       * Single capture callback that receives every status-line and pane-
       * stream event the subtask would have emitted. Tests typically pass
       * `vi.fn()` and assert via `capture.mock.calls`.
       *
       * Lines are tagged with a `[status]` or `[stream]` prefix so tests can
       * distinguish without needing two separate sinks.
       */
      capture: (line: string) => void;
    };

/**
 * Convenience factory for tests. Equivalent to constructing the literal:
 *
 *   const relay = makeTestRelay();
 *   // launchHeadlessSubtask({ ..., relaySession: relay });
 *   expect(relay.capture).toHaveBeenCalledWith("[status] running op-evaluate");
 *
 * The returned `capture` is plain — vitest tests usually wrap it (`vi.fn()`)
 * and pass that wrapper instead. The factory exists for non-vitest callers
 * (a future jest harness, a node runtime probe) that still want the right
 * shape.
 */
export function makeTestRelay(capture: (line: string) => void = () => {}): RelaySession {
  return { kind: "test", capture };
}

/**
 * Convenience factory for production callsites that don't have a real tmux
 * pane to relay through (the evaluator path today). The factory is a thin
 * literal constructor — useful only for keeping the construction co-located
 * with the docs for the variant.
 */
export function makeTmuxRelay(args: {
  target: string;
  statusLine: (line: string) => void;
  paneStream: (chunk: string) => void;
}): RelaySession {
  return {
    kind: "tmux",
    target: args.target,
    statusLine: args.statusLine,
    paneStream: args.paneStream,
  };
}

/**
 * Emit a status-line event through whichever variant the relay is. Keeps
 * the call sites concise and centralizes the test-variant capture format
 * ("[status] <line>"). Returns `void`.
 */
export function emitStatus(relay: RelaySession, line: string): void {
  if (relay.kind === "tmux") {
    relay.statusLine(line);
    return;
  }
  if (relay.kind === "test") {
    relay.capture(`[status] ${line}`);
    return;
  }
  return assertNeverRelay(relay);
}

/**
 * Emit a stream chunk through whichever variant the relay is.
 */
export function emitStream(relay: RelaySession, chunk: string): void {
  if (relay.kind === "tmux") {
    relay.paneStream(chunk);
    return;
  }
  if (relay.kind === "test") {
    relay.capture(`[stream] ${chunk}`);
    return;
  }
  return assertNeverRelay(relay);
}

/**
 * Exhaustiveness helper. Adding a new `RelaySession` variant without handling
 * it in a `switch` becomes a TypeScript compile error pointing at the unhandled
 * branch.
 */
function assertNeverRelay(relay: never): never {
  throw new Error(`unhandled RelaySession variant: ${JSON.stringify(relay)}`);
}
