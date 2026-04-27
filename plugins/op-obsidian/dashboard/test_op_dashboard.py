"""Pure-Python tests for op-dashboard.py — no aiohttp, no iterm2, no tmux.

Run from the repo root with `python3 plugins/op-obsidian/dashboard/test_op_dashboard.py`
or via `python3 -m unittest discover plugins/op-obsidian/dashboard/`.

These cover the bits the daemon ships that don't require live IPC: regex
classifiers, tmux output parsing, base64 user-var decoding, token roundtrip,
and the data.json reader's defensive fallbacks.
"""
from __future__ import annotations

import base64
import importlib.util
import json
import os
import stat
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("op_dashboard", HERE / "op-dashboard.py")
opd = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
sys.modules["op_dashboard"] = opd
assert spec and spec.loader
spec.loader.exec_module(opd)  # type: ignore[union-attr]

# Silence the daemon logger during test runs — its warnings on malformed
# fixtures are expected behavior covered by assertions.
import logging as _logging
opd.log.setLevel(_logging.CRITICAL)


class TmuxParseTests(unittest.TestCase):
    def test_parse_list_windows(self):
        out = "op-agents:OP-217\nop-agents-1:OP-218\nmain:scratch\n"
        rows = opd.parse_list_windows(out)
        self.assertEqual(rows, [
            ("op-agents", "OP-217"),
            ("op-agents-1", "OP-218"),
            ("main", "scratch"),
        ])

    def test_parse_list_windows_skips_blank_and_malformed(self):
        out = "\n  \nfoo\n:bar\nop-agents:OP-1\n"
        rows = opd.parse_list_windows(out)
        # `:bar` parses to ("", "bar") — partition on first `:` gives empty
        # session; the filter rejects it next.
        self.assertIn(("op-agents", "OP-1"), rows)

    def test_filter_op_agent_windows(self):
        rows = [
            ("op-agents", "OP-1"),
            ("op-agents-2", "OP-2"),
            ("op-agents-22", "OP-3"),
            ("main", "x"),
            ("op-agents-x", "y"),  # not numeric suffix
            ("opagents", "z"),
        ]
        kept = opd.filter_op_agent_windows(rows)
        self.assertEqual(kept, [
            ("op-agents", "OP-1"),
            ("op-agents-2", "OP-2"),
            ("op-agents-22", "OP-3"),
        ])


class StateClassifierTests(unittest.TestCase):
    def setUp(self):
        self.cls = opd.CLAUDE_CLASSIFIER

    def test_running_when_recent_activity(self):
        self.assertEqual(opd.classify_state("hello world", 5.0, self.cls), "running")

    def test_idle_when_stale(self):
        self.assertEqual(opd.classify_state("hello world", 60.0, self.cls), "idle")

    def test_waiting_user_yes_no(self):
        self.assertEqual(opd.classify_state("Continue? (yes/no)", 5.0, self.cls), "waiting_user")

    def test_waiting_user_y_n(self):
        self.assertEqual(opd.classify_state("Apply diff (y/n)?", 5.0, self.cls), "waiting_user")

    def test_waiting_user_do_you_want_to(self):
        self.assertEqual(
            opd.classify_state("Do you want to proceed", 5.0, self.cls),
            "waiting_user",
        )

    def test_waiting_review(self):
        s = "Polling for Copilot review (attempt 3/12)"
        self.assertEqual(opd.classify_state(s, 5.0, self.cls), "waiting_review")

    def test_spinner_suppresses_waiting_user(self):
        # Spinner glyph ⠹ in the tail vetoes waiting_user — agent is mid-thought.
        s = "⠹ Thinking…\n(yes/no)"
        self.assertEqual(opd.classify_state(s, 5.0, self.cls), "running")

    def test_context_pct_extraction(self):
        s = "Context left until auto-compact: 23%"
        self.assertEqual(opd.extract_context_pct(s, self.cls), 23)
        self.assertEqual(opd.extract_context_pct("context: 38%", self.cls), 38)
        self.assertIsNone(opd.extract_context_pct("no context here", self.cls))

    def test_context_pct_clamped(self):
        s = "context: 999%"
        # Clamps to 100 (defensive; real Claude won't print >100).
        self.assertEqual(opd.extract_context_pct(s, self.cls), 100)


class UserOpIssueDecodeTests(unittest.TestCase):
    def test_base64_roundtrip(self):
        b64 = base64.b64encode(b"OP-217").decode()
        self.assertEqual(opd.decode_user_op_issue(b64), "OP-217")

    def test_raw_passes_through(self):
        # `OP-217` is not valid base64 (length 6, non-mult-of-4) → raw fallback.
        self.assertEqual(opd.decode_user_op_issue("OP-217"), "OP-217")

    def test_empty(self):
        self.assertIsNone(opd.decode_user_op_issue(""))

    def test_whitespace_stripped(self):
        self.assertEqual(opd.decode_user_op_issue("  OP-217  "), "OP-217")

    def test_b64_with_padding(self):
        b64 = base64.b64encode(b"OP-1").decode()
        self.assertEqual(opd.decode_user_op_issue(b64), "OP-1")


class TokenWriteTests(unittest.TestCase):
    def test_token_persisted_mode_0600(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "tok"
            opd.write_token(path, "abc123")
            mode = stat.S_IMODE(path.stat().st_mode)
            self.assertEqual(mode, 0o600)
            self.assertEqual(path.read_text(), "abc123")

    def test_token_overwrite(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "tok"
            opd.write_token(path, "first")
            opd.write_token(path, "second")
            self.assertEqual(path.read_text(), "second")
            # Mode preserved across rewrites.
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)

    def test_token_generation_is_unique_and_urlsafe(self):
        a = opd.generate_token()
        b = opd.generate_token()
        self.assertNotEqual(a, b)
        # token_urlsafe outputs only [A-Za-z0-9_-].
        self.assertRegex(a, r"^[A-Za-z0-9_\-]+$")


class AuthTests(unittest.TestCase):
    def test_token_ok_constant_time(self):
        self.assertTrue(opd.token_ok("abc", "abc"))
        self.assertFalse(opd.token_ok("abc", "abcd"))
        self.assertFalse(opd.token_ok("", "abc"))
        self.assertFalse(opd.token_ok("abc", ""))


class DataJsonReaderTests(unittest.TestCase):
    def _write(self, payload):
        td = tempfile.mkdtemp()
        path = Path(td) / "data.json"
        path.write_text(json.dumps(payload))
        return path

    def test_reads_orchestrator_state(self):
        path = self._write({
            "orchestratorState": {
                "surfaces": {
                    "OP-217": {"agentId": "claude", "agentMeta": {"model": "claude-sonnet-4-6"}},
                    "OP-218": {"agentId": "codex"},
                },
            },
        })
        out = opd.read_orchestrator_state(path)
        self.assertEqual(set(out.keys()), {"OP-217", "OP-218"})
        self.assertEqual(out["OP-217"]["agentId"], "claude")

    def test_pre_op217_data_json_yields_empty(self):
        # Pre-OP-217 data.json has no orchestratorState. Schema-drift test.
        path = self._write({"someOtherKey": 1})
        self.assertEqual(opd.read_orchestrator_state(path), {})

    def test_malformed_json_returns_empty(self):
        td = tempfile.mkdtemp()
        path = Path(td) / "data.json"
        path.write_text("not json {")
        self.assertEqual(opd.read_orchestrator_state(path), {})

    def test_missing_orchestrator_state_returns_empty(self):
        path = self._write({"orchestratorState": "wrong-type"})
        self.assertEqual(opd.read_orchestrator_state(path), {})

    def test_extract_agent_meta_defensive(self):
        # Pre-OP-217 surface ref with no agentMeta → all defaults.
        agent_id, model, workdir, started = opd.extract_agent_meta({})
        self.assertEqual(agent_id, "claude")
        self.assertIsNone(model)
        self.assertIsNone(workdir)
        self.assertIsNone(started)

    def test_extract_agent_meta_full(self):
        ref = {
            "agentId": "codex",
            "agentMeta": {
                "model": "gpt-5",
                "workdir": "/tmp/wd",
                "startTime": 1714200000_000,  # epoch ms
            },
        }
        agent_id, model, workdir, started = opd.extract_agent_meta(ref)
        self.assertEqual(agent_id, "codex")
        self.assertEqual(model, "gpt-5")
        self.assertEqual(workdir, "/tmp/wd")
        self.assertAlmostEqual(started, 1714200000.0, places=3)


class SessionRegistryTests(unittest.TestCase):
    def test_upsert_new_then_merge(self):
        reg = opd.SessionRegistry()
        s1 = opd.AgentSession(issue_id="OP-1", tmux_target="op-agents:OP-1")
        is_new, _ = reg.upsert(s1)
        self.assertTrue(is_new)
        # Second upsert with new model — merges, doesn't duplicate.
        s2 = opd.AgentSession(issue_id="OP-1", tmux_target="op-agents:OP-1", model="claude-sonnet-4-6")
        is_new, merged = reg.upsert(s2)
        self.assertFalse(is_new)
        self.assertEqual(merged.model, "claude-sonnet-4-6")
        self.assertEqual(len(reg.values()), 1)

    def test_remove(self):
        reg = opd.SessionRegistry()
        reg.upsert(opd.AgentSession(issue_id="OP-1"))
        self.assertIsNotNone(reg.remove("OP-1"))
        self.assertIsNone(reg.get("OP-1"))


class AgentSessionToJsonTests(unittest.TestCase):
    def test_to_json_excludes_internals(self):
        s = opd.AgentSession(issue_id="OP-1", tmux_target="op-agents:OP-1")
        s._last_capture_hash = 1234
        s._exited_at = 1000.0
        d = s.to_json()
        self.assertNotIn("_last_capture_hash", d)
        self.assertNotIn("_exited_at", d)
        self.assertEqual(d["issue_id"], "OP-1")

    def test_iso_serialization(self):
        ts = 1714200000.0
        out = opd.iso(ts)
        self.assertIsNotNone(out)
        self.assertTrue(out.endswith("+00:00"))
        self.assertIsNone(opd.iso(None))


class TmuxSessionRegexTests(unittest.TestCase):
    def test_matches(self):
        for s in ["op-agents", "op-agents-1", "op-agents-22", "op-agents-100"]:
            self.assertIsNotNone(opd.TMUX_SESSION_RE.match(s))

    def test_rejects(self):
        for s in ["op-agent", "op-agentsx", "op-agents-", "op-agents-1a", "main"]:
            self.assertIsNone(opd.TMUX_SESSION_RE.match(s))


if __name__ == "__main__":
    unittest.main()
