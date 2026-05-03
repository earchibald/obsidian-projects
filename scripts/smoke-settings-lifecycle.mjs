#!/usr/bin/env node
// OP-241 — rendered-DOM smoke harness for the op-obsidian Settings tab.
//
// Usage:
//   node scripts/smoke-settings-lifecycle.mjs
//
// Preconditions:
//   - OP-Test is open in Obsidian (any window — focus not required).
//   - The op-obsidian build under test has already been synced to OP-Test
//     (`node scripts/dev-sync.mjs`).
//
// What it asserts:
//   1. Settings tab opens, the Dashboard collapsible exists, and expanding it
//      reveals a port input (`type=number` with `min`/`max` matching the
//      declared 1024–65535 range).
//   2. Inline error feedback (OP-241):
//        - typing an out-of-range value badges the input
//          (`aria-invalid="true"`, `.op-port-input--invalid`) and renders the
//          `.op-port-error` span with a non-empty message;
//        - typing a valid in-range value clears the badge and message.
//   3. Lifecycle: closing + reopening the Settings modal re-renders the tab
//      without throwing. The OP-235 `AbortController` reset path means a
//      mid-fetch close + reopen must not leak — we verify the tab can be
//      re-rendered N times in a row and the rendered surface stays stable
//      (row counts match across renders).
//
// On any assertion failure, prints a concise FAIL summary and exits non-zero.

import { assertOpTestVaultOpen, fail, runObsidian } from "./lib/op-test.mjs";

assertOpTestVaultOpen();

// All probes route via `obsidian vault=OP-Test eval code=…`. We read the
// trimmed stdout (the CLI prefixes with "=> ") and JSON.parse the payload —
// every eval body returns a JSON-serialisable object so we don't have to
// regex-parse Obsidian's pretty printer.
function evalJson(code) {
  // Wrap so the body can use early-returns and complex expressions.
  const wrapped = `(()=>{ try { return ${code}; } catch (e) { return { __error: String(e && e.message || e), stack: String(e && e.stack || "") }; } })()`;
  const r = runObsidian(["eval", `code=JSON.stringify(${wrapped})`]);
  const out = (r.stdout || "").trim();
  // The CLI emits `=> "<json-string>"` for string returns; strip the prefix
  // and the surrounding quotes, then unescape, then parse.
  const m = out.match(/^=>\s*([\s\S]*)$/);
  if (!m) fail(`unexpected probe stdout shape:\n${out}`);
  let raw = m[1].trim();
  if (raw.startsWith('"') && raw.endsWith('"')) {
    try {
      raw = JSON.parse(raw); // unescape outer string
    } catch (e) {
      fail(`failed to unescape probe payload: ${e.message}\n${out}`);
    }
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    fail(`failed to parse probe JSON: ${e.message}\n${raw}`);
  }
  if (parsed && parsed.__error) {
    fail(`probe threw: ${parsed.__error}\n${parsed.stack || ""}`);
  }
  return parsed;
}

function expandDashboardSection() {
  return evalJson(`(()=>{
    app.setting.open();
    app.setting.openTabById("op-obsidian");
    const header = document.querySelector('[data-op-section="dashboard"] .op-collapsible__header');
    if (!header) return { ok: false, reason: 'dashboard section header not found' };
    // Click only if collapsed — clicking an already-open header collapses it.
    const wrap = header.closest('.op-collapsible');
    if (wrap && !wrap.classList.contains('op-collapsible--open')) header.click();
    return { ok: true };
  })()`);
}

function probePortInput() {
  return evalJson(`(()=>{
    const input = document.querySelector('.op-port-input');
    if (!input) return { found: false };
    return {
      found: true,
      inputCount: document.querySelectorAll('.op-port-input').length,
      errorCount: document.querySelectorAll('.op-port-error').length,
      type: input.type,
      min: input.min,
      max: input.max,
      ariaInvalid: input.getAttribute('aria-invalid'),
      hasInvalidClass: input.classList.contains('op-port-input--invalid'),
      errorVisible: (() => {
        const e = document.querySelector('.op-port-error');
        if (!e) return null;
        const styled = (e.style && e.style.display) || '';
        return { text: e.textContent || '', display: styled };
      })(),
    };
  })()`);
}

// Drive the input via real DOM events so the Setting's onChange fires in the
// current Obsidian build and still trips if the implementation shifts from
// `input` to `change` later. Returns the post-handler probe state.
function setPortValue(raw) {
  return evalJson(`(()=>{
    const input = document.querySelector('.op-port-input');
    if (!input) return { found: false };
    input.value = ${JSON.stringify(String(raw))};
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return { found: true };
  })()`);
}

// ─── §1: open + structure ──────────────────────────────────────────────────
const open = expandDashboardSection();
if (!open.ok) fail(`§1: ${open.reason}`);

const initial = probePortInput();
if (!initial.found) {
  fail(
    "§1: .op-port-input not present after expanding Dashboard section.\n" +
      "    Either the section id / class moved or the build under test is stale.\n" +
      "    Re-run `node scripts/dev-sync.mjs`.",
  );
}
if (initial.type !== "number") fail(`§1: port input type=${initial.type}, expected 'number'`);
if (initial.min !== "1024" || initial.max !== "65535") {
  fail(`§1: port input min/max=${initial.min}/${initial.max}, expected 1024/65535`);
}
if (initial.inputCount !== 1 || initial.errorCount !== 1) {
  fail(`§1: expected exactly one port input + one error node, got inputCount=${initial.inputCount}, errorCount=${initial.errorCount}`);
}
if (initial.ariaInvalid != null || initial.hasInvalidClass) {
  fail(`§1: port input started in error state — ariaInvalid=${initial.ariaInvalid}, hasInvalidClass=${initial.hasInvalidClass}`);
}

// ─── §2: invalid → error badged ────────────────────────────────────────────
setPortValue("99999");
let after = probePortInput();
if (after.ariaInvalid !== "true" || !after.hasInvalidClass) {
  fail(
    `§2: out-of-range value did not badge the input.\n` +
      `    aria-invalid=${after.ariaInvalid}, hasInvalidClass=${after.hasInvalidClass}`,
  );
}
if (!after.errorVisible || !after.errorVisible.text || after.errorVisible.text.trim() === "") {
  fail(`§2: error span empty after invalid input — got ${JSON.stringify(after.errorVisible)}`);
}
if (after.errorVisible.display === "none") {
  fail(`§2: error span hidden after invalid input — display=${after.errorVisible.display}`);
}

// ─── §2b: below-floor numeric input also flagged ───────────────────────────
// Note: `type=number` inputs reject alpha keystrokes at the browser layer
// (the .value stays empty), so we exercise the validator with a numeric
// value below the documented floor instead — that path can only be covered
// by the validator, not the input element.
setPortValue("100");
after = probePortInput();
if (after.ariaInvalid !== "true") {
  fail(`§2b: below-floor numeric input not flagged — aria-invalid=${after.ariaInvalid}`);
}

// ─── §2c: valid input clears the badge ─────────────────────────────────────
setPortValue("49217");
after = probePortInput();
if (after.ariaInvalid === "true" || after.hasInvalidClass) {
  fail(
    `§2c: valid input did not clear error badge.\n` +
      `    aria-invalid=${after.ariaInvalid}, hasInvalidClass=${after.hasInvalidClass}`,
  );
}
if (after.errorVisible && after.errorVisible.display !== "none" && after.errorVisible.text.trim() !== "") {
  fail(`§2c: error span still visible after valid input — ${JSON.stringify(after.errorVisible)}`);
}

// ─── §3: lifecycle — close + reopen Settings ───────────────────────────────
function closeSettings() {
  evalJson(`(()=>{ app.setting.close(); return { ok: true }; })()`);
}

function tabRowCount() {
  const r = evalJson(`(()=>{
    app.setting.open();
    app.setting.openTabById('op-obsidian');
    return {
      rows: document.querySelectorAll('.setting-item').length,
      portInputCount: document.querySelectorAll('.op-port-input').length,
      portErrorCount: document.querySelectorAll('.op-port-error').length,
    };
  })()`);
  return r;
}

const baseline = tabRowCount();
let stableCount = 0;
const lifecycleCycles = 10;
for (let i = 0; i < lifecycleCycles - 1; i++) {
  closeSettings();
  const next = tabRowCount();
  if (
    next.rows === baseline.rows &&
    next.portInputCount === 1 &&
    next.portErrorCount === 1
  ) {
    stableCount++;
  } else {
    fail(
      `§3: lifecycle render #${i + 1} drifted from baseline.\n` +
        `    rows=${next.rows} (baseline ${baseline.rows})\n` +
        `    portInputCount=${next.portInputCount}\n` +
        `    portErrorCount=${next.portErrorCount}`,
    );
  }
}
if (stableCount !== lifecycleCycles - 1) {
  fail(`§3: only ${stableCount}/${lifecycleCycles - 1} lifecycle re-renders matched baseline`);
}

// Final cleanup — leave the modal closed.
closeSettings();

console.log(
  `PASS — settings-lifecycle smoke (${baseline.rows} rows × ${lifecycleCycles} renders, port-input badge round-trip OK)`,
);
