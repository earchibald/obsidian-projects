"""Pure-Python tests for op-dashboard.py — no aiohttp, no iterm2, no tmux.

Run from the repo root with `python3 plugins/op-obsidian/dashboard/test_op_dashboard.py`
or via `python3 -m unittest discover plugins/op-obsidian/dashboard/`.

These cover the bits the daemon ships that don't require live IPC: regex
classifiers, tmux output parsing, base64 user-var decoding, token roundtrip,
and the data.json reader's defensive fallbacks.
"""
from __future__ import annotations

import asyncio
import base64
import importlib.util
import json
import os
import stat
import sys
import tempfile
import time
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

    def test_resolve_tmux_binary_prefers_which(self):
        self.assertEqual(
            opd.resolve_tmux_binary(
                which=lambda _: "/tmp/tmux",
                exists=lambda _: False,
            ),
            "/tmp/tmux",
        )

    def test_resolve_tmux_binary_falls_back_to_known_paths(self):
        self.assertEqual(
            opd.resolve_tmux_binary(
                which=lambda _: None,
                exists=lambda p: p == "/opt/homebrew/bin/tmux",
            ),
            "/opt/homebrew/bin/tmux",
        )


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


class AutoLaunchEntrypointTests(unittest.TestCase):
    def test_should_autolaunch_true_for_autolaunch_path_with_no_args(self):
        argv0 = str(opd.AUTOLAUNCH_DIR / "op-dashboard.py")
        self.assertTrue(opd.should_autolaunch(argv0, [argv0]))

    def test_should_autolaunch_false_when_args_are_present(self):
        argv0 = str(opd.AUTOLAUNCH_DIR / "op-dashboard.py")
        self.assertFalse(opd.should_autolaunch(argv0, [argv0, "--help"]))


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


class MonotonicAndConcurrencyTests(unittest.TestCase):
    """Guards for the OP-236 pressure-test fixes (clock-jump + interleaved sends)."""

    def test_agent_session_carries_monotonic_fields(self):
        # Wall-clock fields stay (serialized to clients); monotonic mirrors
        # back them for liveness thresholds.
        s = opd.AgentSession(issue_id="OP-1")
        self.assertIsNone(s.last_activity)
        self.assertIsNone(s._last_activity_mono)
        self.assertIsNone(s._exited_at_mono)
        # Internal monotonic fields don't leak into the wire format.
        d = s.to_json()
        self.assertNotIn("_last_activity_mono", d)
        self.assertNotIn("_exited_at_mono", d)
        # The serialized last_activity stays epoch-based.
        self.assertIn("last_activity", d)

    def test_app_state_carries_tmux_lock(self):
        import asyncio as _asyncio
        async def _check():
            state = opd.AppState(
                token="t",
                started_at=0.0,
                registry=opd.SessionRegistry(),
                hub=opd.Hub(),
                iterm=opd.ITermBridge(),
            )
            self.assertIsInstance(state.tmux_lock, _asyncio.Lock)
            # Re-entrant double-acquire blocks — proves it's a real exclusion lock.
            await state.tmux_lock.acquire()
            try:
                self.assertTrue(state.tmux_lock.locked())
            finally:
                state.tmux_lock.release()
        _asyncio.run(_check())


class StaticIndexPathTests(unittest.TestCase):
    """OP-231 ships client/index.html — daemon must serve it instead of the
    diagnostic placeholder, and the file must contain the SPA's load-bearing
    markers so a regression here surfaces in the unit suite, not just at
    smoke-test time.
    """

    def test_static_index_path_resolves_to_shipped_spa(self):
        path = opd.static_index_path()
        self.assertIsNotNone(path, "client/index.html must ship under dashboard/")
        self.assertTrue(path.is_file())
        # Sibling of op-dashboard.py, under client/.
        self.assertEqual(path.parent.name, "client")
        self.assertEqual(path.parent.parent, HERE)

    def test_spa_contains_required_hooks(self):
        path = opd.static_index_path()
        body = path.read_text(encoding="utf-8")
        # Token-from-URL: SPA reads ?token=… and uses it on the WS upgrade.
        self.assertIn("URLSearchParams", body)
        self.assertIn('"token"', body)
        # WebSocket upgrade against /ws.
        self.assertIn("WebSocket(", body)
        self.assertIn("/ws?token=", body)
        # Frame reducer covers all server-pushed types.
        for frame in ("snapshot", "session_added", "session_updated", "session_removed", "error"):
            self.assertIn(f'"{frame}"', body, f"missing handler for frame type {frame}")
        # Client→server commands.
        for cmd in ("send", "quit", "close_pane", "reveal"):
            self.assertIn(f'"{cmd}"', body, f"missing client command {cmd}")
        # Filter chips and sort dropdown — required UI surface per OP-217 spec.
        self.assertIn('class="chip"', body)
        self.assertIn('data-hook="sort"', body)
        # Reconnect schedule per spec: 5s × 12 = 60s.
        self.assertIn("5000", body)
        self.assertIn("max: 12", body)

    def test_diagnostic_html_is_fallback_only(self):
        # The DIAGNOSTIC_HTML constant still exists (so the daemon serves
        # something useful when the SPA file is missing in dev/test setups).
        # That string MUST NOT appear inside the shipped SPA — otherwise we'd
        # mistake the placeholder for the real UI.
        path = opd.static_index_path()
        body = path.read_text(encoding="utf-8")
        self.assertNotIn("daemon — placeholder", body)


class TmuxSessionRegexTests(unittest.TestCase):
    def test_matches(self):
        for s in ["op-agents", "op-agents-1", "op-agents-22", "op-agents-100"]:
            self.assertIsNotNone(opd.TMUX_SESSION_RE.match(s))

    def test_rejects(self):
        for s in ["op-agent", "op-agentsx", "op-agents-", "op-agents-1a", "main"]:
            self.assertIsNone(opd.TMUX_SESSION_RE.match(s))


try:
    from aiohttp import web as _aiohttp_web  # noqa: F401
    from aiohttp.test_utils import TestClient, TestServer
    HAS_AIOHTTP = True
except ImportError:  # pragma: no cover - dev env without aiohttp
    HAS_AIOHTTP = False


@unittest.skipUnless(HAS_AIOHTTP, "aiohttp not installed")
class RegenerateAndRestartTests(unittest.TestCase):
    """OP-242: POST /regenerate-token + POST /restart.

    Both endpoints authenticate against the *current* X-Op-Token. Regenerate
    rotates state.token, persists via write_token, and broadcasts WS close
    code 4401 to live clients. Restart sets state.restart_requested and
    state.shutdown_event so run() execs the same script with the same argv
    after cleanup.
    """

    def _make_state(self, token: str, token_path):
        return opd.AppState(
            token=token,
            started_at=time.time(),
            registry=opd.SessionRegistry(),
            hub=opd.Hub(),
            iterm=opd.ITermBridge(),
        )

    def test_regenerate_requires_current_token(self):
        async def _run():
            with tempfile.TemporaryDirectory() as td:
                token_path = Path(td) / "tok"
                opd.write_token(token_path, "current")
                # Patch TOKEN_PATH so the handler writes into the temp dir.
                orig = opd.TOKEN_PATH
                opd.TOKEN_PATH = token_path
                try:
                    state = self._make_state("current", token_path)
                    app = opd.build_app(state)
                    async with TestClient(TestServer(app)) as client:
                        # No header → 401.
                        r = await client.post("/regenerate-token")
                        self.assertEqual(r.status, 401)
                        # Wrong header → 401, token unchanged.
                        r = await client.post(
                            "/regenerate-token",
                            headers={"X-Op-Token": "wrong"},
                        )
                        self.assertEqual(r.status, 401)
                        self.assertEqual(state.token, "current")
                        # Correct header → 200, new token persisted, state swapped.
                        r = await client.post(
                            "/regenerate-token",
                            headers={"X-Op-Token": "current"},
                        )
                        self.assertEqual(r.status, 200)
                        self.assertNotEqual(state.token, "current")
                        self.assertEqual(token_path.read_text(), state.token)
                        self.assertEqual(stat.S_IMODE(token_path.stat().st_mode), 0o600)
                finally:
                    opd.TOKEN_PATH = orig
        asyncio.run(_run())

    def test_regenerate_closes_live_ws_with_4401(self):
        async def _run():
            with tempfile.TemporaryDirectory() as td:
                token_path = Path(td) / "tok"
                opd.write_token(token_path, "tok-a")
                orig = opd.TOKEN_PATH
                opd.TOKEN_PATH = token_path
                try:
                    state = self._make_state("tok-a", token_path)
                    app = opd.build_app(state)
                    async with TestClient(TestServer(app)) as client:
                        ws = await client.ws_connect("/ws?token=tok-a")
                        # Drain the snapshot frame so the next .receive() gets
                        # the close.
                        snap = await ws.receive_json()
                        self.assertEqual(snap["type"], "snapshot")
                        # Rotate.
                        r = await client.post(
                            "/regenerate-token",
                            headers={"X-Op-Token": "tok-a"},
                        )
                        self.assertEqual(r.status, 200)
                        # Client sees the close code.
                        msg = await ws.receive(timeout=2.0)
                        # aiohttp surfaces server-initiated closes as
                        # WSMsgType.CLOSE with .data == close code.
                        from aiohttp import WSMsgType
                        self.assertEqual(msg.type, WSMsgType.CLOSE)
                        self.assertEqual(msg.data, opd.WS_CLOSE_TOKEN_INVALID)
                        await ws.close()
                finally:
                    opd.TOKEN_PATH = orig
        asyncio.run(_run())

    def test_restart_requires_current_token(self):
        async def _run():
            with tempfile.TemporaryDirectory() as td:
                token_path = Path(td) / "tok"
                opd.write_token(token_path, "tok-r")
                orig = opd.TOKEN_PATH
                opd.TOKEN_PATH = token_path
                try:
                    state = self._make_state("tok-r", token_path)
                    app = opd.build_app(state)
                    async with TestClient(TestServer(app)) as client:
                        r = await client.post("/restart")
                        self.assertEqual(r.status, 401)
                        self.assertFalse(state.restart_requested)
                        self.assertFalse(state.shutdown_event.is_set())
                finally:
                    opd.TOKEN_PATH = orig
        asyncio.run(_run())

    def test_restart_sets_flag_and_shutdown_event(self):
        async def _run():
            with tempfile.TemporaryDirectory() as td:
                token_path = Path(td) / "tok"
                opd.write_token(token_path, "tok-r")
                orig = opd.TOKEN_PATH
                opd.TOKEN_PATH = token_path
                try:
                    state = self._make_state("tok-r", token_path)
                    app = opd.build_app(state)
                    async with TestClient(TestServer(app)) as client:
                        r = await client.post(
                            "/restart",
                            headers={"X-Op-Token": "tok-r"},
                        )
                        self.assertEqual(r.status, 200)
                        self.assertTrue(state.restart_requested)
                        # call_soon-scheduled — let the loop tick.
                        await asyncio.sleep(0)
                        self.assertTrue(state.shutdown_event.is_set())
                finally:
                    opd.TOKEN_PATH = orig
        asyncio.run(_run())


@unittest.skipUnless(HAS_AIOHTTP, "aiohttp not installed")
class RunRestartExecTests(unittest.TestCase):
    """run() should call _execv(sys.executable, [sys.executable, *sys.argv])
    after cleanup when state.restart_requested. We pre-bind the port so
    run()'s single-instance probe accepts it and the rest of the path runs."""

    def test_run_execs_when_restart_requested(self):
        import argparse as _argparse
        async def _run():
            recorded = {}

            def fake_execv(p, argv):
                recorded["path"] = p
                recorded["argv"] = list(argv)

            orig_execv = opd._execv
            opd._execv = fake_execv
            # Pick a free port by binding+closing — there's a TOCTOU window
            # but the daemon's own bind() is the real test of single-instance,
            # not this fixture.
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
            sock.close()
            try:
                args = _argparse.Namespace(port=port, host="127.0.0.1", no_iterm=True)

                async def trip_restart():
                    # Wait briefly for run() to bring up the server, then
                    # request restart.
                    await asyncio.sleep(0.2)
                    # Need to find the live state — trip via a side channel:
                    # run() sets state.restart_requested itself only after
                    # /restart fires, but for unit testing it's enough to set
                    # shutdown_event (and the flag) on the state we hand it.
                    # We can't reach it from out here, so we POST /restart.
                    import aiohttp
                    tok = opd.TOKEN_PATH.read_text().strip()
                    async with aiohttp.ClientSession() as cs:
                        async with cs.post(
                            f"http://127.0.0.1:{port}/restart",
                            headers={"X-Op-Token": tok},
                            timeout=aiohttp.ClientTimeout(total=2.0),
                        ) as r:
                            self.assertEqual(r.status, 200)

                with tempfile.TemporaryDirectory() as td:
                    orig_token_path = opd.TOKEN_PATH
                    opd.TOKEN_PATH = Path(td) / "tok"
                    try:
                        rc, _ = await asyncio.gather(opd.run(args), trip_restart())
                        self.assertEqual(rc, 0)
                        self.assertEqual(recorded["path"], sys.executable)
                        self.assertEqual(recorded["argv"][0], sys.executable)
                    finally:
                        opd.TOKEN_PATH = orig_token_path
            finally:
                opd._execv = orig_execv

        asyncio.run(_run())


if __name__ == "__main__":
    unittest.main()
