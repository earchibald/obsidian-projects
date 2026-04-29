#!/usr/bin/env python3
"""op-dashboard.py — agent dashboard daemon (OP-217).

See docs/specs/OP-217-agent-dashboard.md for the product spec. This script
is shipped under plugins/op-obsidian/dashboard/op-dashboard.py and copied
into ~/Library/ApplicationSupport/iTerm2/Scripts/AutoLaunch/ by the
plugin's Setup modal (OP-232).

Runtime requirements:
    Install aiohttp into iTerm's bundled Python runtime; `iterm2` ships there.

The `iterm2` package is best-effort — if it's missing or the API is
disabled, the daemon runs in tmux-only mode (Close pane returns an error
frame and the iterm_session_id field is null on every row).
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import contextlib
import errno
import hmac
import json
import logging
import logging.handlers
import os
import re
import secrets
import signal
import socket
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

try:
    import iterm2  # type: ignore
except ImportError:
    iterm2 = None  # type: ignore[assignment]

# ---- Constants -------------------------------------------------------------

VERSION = "0.1.0"
DEFAULT_PORT = 49217
DEFAULT_HOST = "127.0.0.1"

HOME = Path(os.path.expanduser("~"))
AUTOLAUNCH_DIR = HOME / "Library/Application Support/iTerm2/Scripts/AutoLaunch"
TOKEN_PATH = AUTOLAUNCH_DIR / "op-dashboard.token"
CONFIG_PATH = AUTOLAUNCH_DIR / "op-dashboard.config.json"
LOG_PATH = HOME / "Library/Logs/op-dashboard.log"

POLL_INTERVAL_S = 1.0
CAPTURE_TAIL_LINES = 50
CAPTURE_DISPLAY_LINES = 30
RUNNING_DELTA_THRESHOLD_S = 30
EXITED_GRACE_S = 5 * 60

WS_CLOSE_TOKEN_INVALID = 4401

# Matches `op-agents` and `op-agents-1`, `op-agents-2`, etc.
TMUX_SESSION_RE = re.compile(r"^op-agents(?:-\d+)?$")

VALID_STATES = ("running", "waiting_user", "waiting_review", "idle", "exited")

# Spinner glyphs claude-code/claude-cli print while a turn is in flight. If
# any are present in the tail, suppress `waiting_user` classification — the
# agent is mid-thought, not asking the user a question. ASCII spinners
# (`|/-\`) are intentionally NOT included: `(y/n)` and similar prompts
# contain literal slashes and were causing false suppressions.
SPINNER_CHARS = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏◐◓◑◒"

log = logging.getLogger("op-dashboard")


# ---- Logging ---------------------------------------------------------------

def setup_logging() -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    if log.handlers:
        return
    log.setLevel(logging.INFO)
    fmt = logging.Formatter(
        "%(asctime)s %(levelname)s %(name)s: %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S%z",
    )
    file_h = logging.handlers.RotatingFileHandler(
        LOG_PATH, maxBytes=1_000_000, backupCount=3, encoding="utf-8"
    )
    file_h.setFormatter(fmt)
    log.addHandler(file_h)
    stderr_h = logging.StreamHandler()
    stderr_h.setFormatter(fmt)
    log.addHandler(stderr_h)


# ---- Token management ------------------------------------------------------

def generate_token() -> str:
    return secrets.token_urlsafe(32)


def write_token(path: Path, token: str) -> None:
    """Write the token atomically with mode 0600."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    flags = os.O_WRONLY | os.O_CREAT | os.O_TRUNC
    fd = os.open(str(tmp), flags, 0o600)
    try:
        os.write(fd, token.encode("utf-8"))
    finally:
        os.close(fd)
    os.replace(str(tmp), str(path))
    os.chmod(str(path), 0o600)


# ---- AgentSession dataclass + serialization --------------------------------

@dataclass
class AgentSession:
    issue_id: str
    iterm_session_id: Optional[str] = None
    tmux_target: str = ""
    agent_id: str = "claude"
    model: Optional[str] = None
    context_pct: Optional[int] = None
    state: str = "idle"
    last_activity: Optional[float] = None  # epoch s — for client serialization
    last_capture: str = ""
    started_at: Optional[float] = None     # epoch s — for client serialization
    workdir: Optional[str] = None
    stale: bool = False
    # Internal — not serialized:
    _last_capture_hash: int = 0
    # Monotonic timestamps — used for liveness thresholds. Survives wall-clock
    # jumps (NTP, manual clock changes) that would otherwise produce negative
    # ages and pin classify_state() at "running" forever.
    _last_activity_mono: Optional[float] = None
    _exited_at_mono: Optional[float] = None

    def to_json(self) -> dict:
        return {
            "issue_id": self.issue_id,
            "iterm_session_id": self.iterm_session_id,
            "tmux_target": self.tmux_target,
            "agent_id": self.agent_id,
            "model": self.model,
            "context_pct": self.context_pct,
            "state": self.state,
            "last_activity": iso(self.last_activity),
            "last_capture": self.last_capture,
            "started_at": iso(self.started_at),
            "workdir": self.workdir,
            "stale": self.stale,
        }


def iso(t: Optional[float]) -> Optional[str]:
    if t is None:
        return None
    return datetime.fromtimestamp(t, tz=timezone.utc).isoformat()


# ---- State classifiers -----------------------------------------------------

@dataclass
class StateClassifier:
    waiting_user: List[re.Pattern]
    waiting_review: List[re.Pattern]
    context_pct: Optional[re.Pattern] = None


CLAUDE_CLASSIFIER = StateClassifier(
    waiting_user=[
        re.compile(r"\(yes/no\)"),
        re.compile(r"\(y/n\)", re.IGNORECASE),
        re.compile(r"\bApprove\?"),
        re.compile(r"\bDo you want to\b"),
        re.compile(r"^\s*❯\s", re.MULTILINE),
        re.compile(r"^\s*\d+\.\s+No,? and ", re.MULTILINE),  # Claude Code menu
    ],
    waiting_review=[
        re.compile(r"Polling for Copilot review"),
        re.compile(r"polling.*review", re.IGNORECASE),
    ],
    context_pct=re.compile(r"context.{0,40}?(\d+)\s*%", re.IGNORECASE),
)

AGENT_CLASSIFIERS: Dict[str, StateClassifier] = {"claude": CLAUDE_CLASSIFIER}


def classify_state(
    capture: str,
    last_activity_age_s: float,
    classifier: StateClassifier,
) -> str:
    """Return one of running|waiting_user|waiting_review|idle.

    `exited` is decided by the reconciler based on tmux liveness and is not
    returned from this function.
    """
    has_spinner = any(c in capture for c in SPINNER_CHARS)
    if not has_spinner:
        for pat in classifier.waiting_user:
            if pat.search(capture):
                return "waiting_user"
    for pat in classifier.waiting_review:
        if pat.search(capture):
            return "waiting_review"
    if last_activity_age_s < RUNNING_DELTA_THRESHOLD_S:
        return "running"
    return "idle"


def extract_context_pct(capture: str, classifier: StateClassifier) -> Optional[int]:
    if classifier.context_pct is None:
        return None
    m = classifier.context_pct.search(capture)
    if not m:
        return None
    try:
        v = int(m.group(1))
    except (TypeError, ValueError):
        return None
    return max(0, min(100, v))


# ---- tmux helpers ----------------------------------------------------------

class TmuxError(Exception):
    pass


async def tmux_run(*args: str, check: bool = True) -> Tuple[int, str, str]:
    """Run `tmux <args...>`, return (rc, stdout, stderr)."""
    proc = await asyncio.create_subprocess_exec(
        "tmux", *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    out_b, err_b = await proc.communicate()
    rc = proc.returncode if proc.returncode is not None else -1
    out = out_b.decode("utf-8", errors="replace")
    err = err_b.decode("utf-8", errors="replace")
    if check and rc != 0 and "no server running" not in (err + out):
        raise TmuxError(f"tmux {' '.join(args)} failed (rc={rc}): {err.strip()}")
    return rc, out, err


def parse_list_windows(stdout: str) -> List[Tuple[str, str]]:
    """Parse `tmux list-windows -a -F '#S:#W'` output → [(session, window)]."""
    out: List[Tuple[str, str]] = []
    for line in stdout.splitlines():
        line = line.strip()
        if not line or ":" not in line:
            continue
        session, _, window = line.partition(":")
        out.append((session, window))
    return out


def filter_op_agent_windows(rows: List[Tuple[str, str]]) -> List[Tuple[str, str]]:
    return [(s, w) for s, w in rows if TMUX_SESSION_RE.match(s)]


async def list_op_agent_windows() -> List[Tuple[str, str]]:
    rc, out, _ = await tmux_run("list-windows", "-a", "-F", "#S:#W", check=False)
    if rc != 0:
        return []
    return filter_op_agent_windows(parse_list_windows(out))


async def capture_pane(target: str, lines: int = CAPTURE_TAIL_LINES) -> str:
    """Capture the last `lines` rows of the named tmux window's active pane."""
    rc, out, _ = await tmux_run(
        "capture-pane", "-p", "-J", "-S", f"-{lines}", "-t", target, check=False
    )
    if rc != 0:
        return ""
    return out


async def send_text(target: str, text: str) -> None:
    """Send a literal string + Enter to the named tmux window."""
    await tmux_run("send-keys", "-t", target, "-l", text, check=False)
    await tmux_run("send-keys", "-t", target, "Enter", check=False)


async def send_enter(target: str) -> None:
    await tmux_run("send-keys", "-t", target, "Enter", check=False)


async def send_quit(target: str) -> None:
    """Send `/quit` + Enter + Enter — Claude Code requires the second Enter."""
    await tmux_run("send-keys", "-t", target, "-l", "/quit", check=False)
    await tmux_run("send-keys", "-t", target, "Enter", check=False)
    await tmux_run("send-keys", "-t", target, "Enter", check=False)


# ---- iTerm bridge (best-effort) --------------------------------------------

class ITermBridge:
    """Wraps the iterm2 Python API. No-ops when the API is unavailable."""

    def __init__(self) -> None:
        self.connection = None
        self.app = None
        self.available = False
        self._uuid_by_issue: Dict[str, str] = {}

    async def start(self, connection: Any = None) -> None:
        if iterm2 is None:
            log.warning("iterm2 Python package not installed — running in tmux-only mode.")
            return
        try:
            self.connection = connection or await iterm2.Connection.async_create()
            self.app = await iterm2.async_get_app(self.connection)
            self.available = True
            log.info("iTerm2 Python API connected.")
        except Exception as e:  # broad: API disabled, version mismatch, socket missing.
            log.warning("iTerm2 Python API unavailable (%s) — running in tmux-only mode.", e)
            self.available = False

    async def scan(self) -> Dict[str, str]:
        """Return {issue_id: iterm_session_id} from `user.op_issue` user vars."""
        if not self.available or self.app is None:
            return {}
        result: Dict[str, str] = {}
        try:
            for window in self.app.terminal_windows:
                for tab in window.tabs:
                    for sess in tab.sessions:
                        try:
                            raw = await sess.async_get_variable("user.op_issue")
                        except Exception:
                            raw = None
                        if not raw:
                            continue
                        issue_id = decode_user_op_issue(str(raw))
                        if issue_id:
                            result[issue_id] = sess.session_id
        except Exception as e:
            log.warning("iterm scan failed: %s", e)
        self._uuid_by_issue = dict(result)
        return result

    async def close_pane(self, issue_id: str) -> bool:
        if not self.available or self.app is None:
            return False
        uuid = self._uuid_by_issue.get(issue_id)
        if not uuid:
            return False
        sess = self.app.get_session_by_id(uuid)
        if sess is None:
            return False
        try:
            await sess.async_close(force=True)
            return True
        except Exception as e:
            log.warning("close_pane(%s) failed: %s", issue_id, e)
            return False


def decode_user_op_issue(raw: str) -> Optional[str]:
    """Best-effort decode of `user.op_issue` — base64 first, raw second."""
    if not raw:
        return None
    raw = raw.strip()
    try:
        decoded = base64.b64decode(raw, validate=True).decode("utf-8", errors="strict")
        if decoded and all(c.isprintable() for c in decoded):
            return decoded.strip()
    except Exception:
        pass
    return raw


# ---- data.json reader ------------------------------------------------------

def find_data_json_paths() -> List[Path]:
    """Return candidate data.json paths from env or config (best-effort)."""
    paths: List[Path] = []
    env = os.environ.get("OP_DASHBOARD_DATA_JSON", "").strip()
    if env:
        for chunk in env.split(":"):
            p = Path(chunk).expanduser()
            if p.exists():
                paths.append(p)
    if CONFIG_PATH.exists():
        try:
            cfg = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
            for chunk in cfg.get("vault_data_paths", []) or []:
                p = Path(str(chunk)).expanduser()
                if p.exists():
                    paths.append(p)
        except Exception as e:
            log.warning("config read failed (%s): %s", CONFIG_PATH, e)
    return paths


def read_orchestrator_state(path: Path) -> Dict[str, dict]:
    """Read the plugin's data.json and return {issue_id: surface-record}.

    Defensive: every field uses .get with a default so a pre-OP-217 data.json
    (no AgentMetadata) yields empty AgentMetadata fields without raising.
    """
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        log.warning("data.json read failed (%s): %s", path, e)
        return {}
    if not isinstance(data, dict):
        return {}
    reg = data.get("orchestratorState") or {}
    surfaces = reg.get("surfaces") if isinstance(reg, dict) else None
    out: Dict[str, dict] = {}
    if isinstance(surfaces, dict):
        for issue_id, ref in surfaces.items():
            if isinstance(ref, dict):
                out[str(issue_id)] = ref
    return out


def extract_agent_meta(ref: dict) -> Tuple[str, Optional[str], Optional[str], Optional[float]]:
    """Pull (agent_id, model, workdir, started_at) from a surface-ref dict."""
    agent_id = "claude"
    model: Optional[str] = None
    workdir: Optional[str] = None
    started_at: Optional[float] = None
    if not isinstance(ref, dict):
        return agent_id, model, workdir, started_at
    aid = ref.get("agentId")
    if isinstance(aid, str) and aid:
        agent_id = aid
    meta = ref.get("agentMeta")
    if isinstance(meta, dict):
        if isinstance(meta.get("model"), str):
            model = meta["model"]
        if isinstance(meta.get("workdir"), str):
            workdir = meta["workdir"]
        st = meta.get("startTime")
        if isinstance(st, (int, float)) and st > 0:
            started_at = float(st) / 1000.0
    return agent_id, model, workdir, started_at


# ---- SessionRegistry -------------------------------------------------------

class SessionRegistry:
    def __init__(self) -> None:
        self.sessions: Dict[str, AgentSession] = {}

    def upsert(self, sess: AgentSession) -> Tuple[bool, AgentSession]:
        existing = self.sessions.get(sess.issue_id)
        if existing is None:
            self.sessions[sess.issue_id] = sess
            return True, sess
        if existing.started_at is None and sess.started_at is not None:
            existing.started_at = sess.started_at
        existing.iterm_session_id = sess.iterm_session_id or existing.iterm_session_id
        existing.tmux_target = sess.tmux_target or existing.tmux_target
        existing.agent_id = sess.agent_id or existing.agent_id
        existing.model = sess.model or existing.model
        existing.workdir = sess.workdir or existing.workdir
        existing.stale = sess.stale
        return False, existing

    def remove(self, issue_id: str) -> Optional[AgentSession]:
        return self.sessions.pop(issue_id, None)

    def get(self, issue_id: str) -> Optional[AgentSession]:
        return self.sessions.get(issue_id)

    def values(self) -> List[AgentSession]:
        return list(self.sessions.values())


# ---- Hub: WebSocket client tracking + broadcast ----------------------------

class Hub:
    def __init__(self) -> None:
        self._clients: Set[Any] = set()
        self._lock = asyncio.Lock()

    async def add(self, ws: Any) -> None:
        async with self._lock:
            self._clients.add(ws)

    async def remove(self, ws: Any) -> None:
        async with self._lock:
            self._clients.discard(ws)

    @property
    def count(self) -> int:
        return len(self._clients)

    async def broadcast(self, frame: dict) -> None:
        async with self._lock:
            clients = list(self._clients)
        msg = json.dumps(frame, default=str)
        for ws in clients:
            try:
                await ws.send_str(msg)
            except Exception as e:
                log.debug("broadcast to client failed: %s", e)

    async def shutdown(self) -> None:
        async with self._lock:
            clients = list(self._clients)
            self._clients.clear()
        for ws in clients:
            with contextlib.suppress(Exception):
                await ws.close()


# ---- Auth ------------------------------------------------------------------

def request_token(request) -> str:
    return (
        request.query.get("token", "")
        or request.headers.get("X-Op-Token", "")
        or ""
    )


def token_ok(provided: str, expected: str) -> bool:
    if not provided or not expected:
        return False
    return hmac.compare_digest(provided.encode("utf-8"), expected.encode("utf-8"))


# ---- App state -------------------------------------------------------------

@dataclass
class AppState:
    token: str
    started_at: float
    registry: SessionRegistry
    hub: Hub
    iterm: ITermBridge
    poll_task: Optional[asyncio.Task] = None
    shutdown_event: asyncio.Event = field(default_factory=asyncio.Event)
    # Serializes mutating tmux operations (send-keys / kill-window) across
    # all clients. Two browser tabs sending to the same window simultaneously
    # would otherwise interleave at command granularity (e.g. tmux receives
    # "foo", "bar", Enter, Enter instead of "foo\n" then "bar\n"). Capture
    # operations are read-only and stay unlocked. Lock granularity is
    # global because tmux's own command processing serializes anyway and
    # the daemon is dev-tooling — N=1..10 agents, throughput is fine.
    tmux_lock: asyncio.Lock = field(default_factory=asyncio.Lock)


# ---- Static index ----------------------------------------------------------

DIAGNOSTIC_HTML = """<!doctype html>
<html><head><meta charset='utf-8'><title>op-dashboard daemon</title>
<style>body{font:14px -apple-system,BlinkMacSystemFont,sans-serif;padding:2em;color:#222;}
h1{font-size:1.2em;margin:0 0 .5em;}code{background:#eee;padding:.1em .3em;border-radius:3px;}</style>
</head><body>
<h1>op-dashboard daemon — placeholder</h1>
<p>The daemon is running. The single-page UI ships in OP-231; until then
this page just confirms the HTTP/WS surface is alive.</p>
<p>Health: <code>GET /healthz?token=&hellip;</code> · WebSocket: <code>/ws?token=&hellip;</code></p>
<p>Logs: <code>~/Library/Logs/op-dashboard.log</code></p>
</body></html>
"""


def static_index_path() -> Optional[Path]:
    """If a sibling client/index.html exists, prefer it (OP-231 ships this)."""
    here = Path(__file__).resolve().parent
    for candidate in (here / "client" / "index.html", here / "index.html"):
        if candidate.is_file():
            return candidate
    return None


# ---- HTTP/WS routes --------------------------------------------------------

def build_app(state: AppState):
    from aiohttp import web, WSMsgType

    routes = web.RouteTableDef()

    @routes.get("/")
    async def index(_request):
        # Index page does NOT require the token — it's chrome. The browser
        # then upgrades to /ws *with* the token; the token gates data.
        path = static_index_path()
        if path is not None:
            return web.FileResponse(path)
        return web.Response(text=DIAGNOSTIC_HTML, content_type="text/html")

    @routes.get("/healthz")
    async def healthz(request):
        if not token_ok(request_token(request), state.token):
            return web.json_response({"ok": False, "error": "auth"}, status=401)
        return web.json_response({
            "ok": True,
            "version": VERSION,
            "uptime_s": int(time.time() - state.started_at),
            "iterm": state.iterm.available,
        })

    @routes.get("/ws")
    async def ws_handler(request):
        if not token_ok(request_token(request), state.token):
            ws = web.WebSocketResponse()
            await ws.prepare(request)
            await ws.close(code=WS_CLOSE_TOKEN_INVALID, message=b"invalid token")
            return ws
        ws = web.WebSocketResponse(heartbeat=30.0)
        await ws.prepare(request)
        await state.hub.add(ws)
        log.info("client connected (clients=%d)", state.hub.count)
        await ws.send_str(json.dumps({
            "type": "snapshot",
            "sessions": [s.to_json() for s in state.registry.values()],
        }))
        try:
            async for msg in ws:
                if msg.type == WSMsgType.TEXT:
                    await dispatch(state, ws, msg.data)
                elif msg.type == WSMsgType.ERROR:
                    log.warning("ws error: %s", ws.exception())
        finally:
            await state.hub.remove(ws)
            log.info("client disconnected (clients=%d)", state.hub.count)
        return ws

    app = web.Application()
    app.add_routes(routes)
    return app


# ---- Frame dispatch --------------------------------------------------------

async def dispatch(state: AppState, ws, raw: str) -> None:
    try:
        frame = json.loads(raw)
    except Exception:
        await ws.send_str(json.dumps(
            {"type": "error", "code": "bad_json", "message": "frame is not JSON"}
        ))
        return
    if not isinstance(frame, dict):
        await ws.send_str(json.dumps(
            {"type": "error", "code": "bad_frame", "message": "frame must be object"}
        ))
        return
    typ = frame.get("type")
    issue_id = str(frame.get("issue_id") or "")
    if typ in ("send", "quit", "close_pane", "reveal", "refresh") and not issue_id:
        await ws.send_str(json.dumps(
            {"type": "error", "code": "missing_issue_id", "message": "issue_id is required"}
        ))
        return
    sess = state.registry.get(issue_id) if issue_id else None
    if typ in ("send", "quit", "close_pane", "reveal", "refresh") and sess is None:
        await ws.send_str(json.dumps({
            "type": "error",
            "code": "unknown_issue",
            "issue_id": issue_id,
            "message": f"no live session for {issue_id}",
        }))
        return
    try:
        if typ == "send":
            text = str(frame.get("text") or "")
            await handle_send(state, sess, text)
        elif typ == "quit":
            await handle_quit(state, sess)
        elif typ == "close_pane":
            await handle_close_pane(state, sess, ws)
        elif typ == "reveal":
            await handle_reveal(state, sess)
        elif typ == "refresh":
            await refresh_one(state, sess)
        else:
            await ws.send_str(json.dumps({
                "type": "error", "code": "bad_type",
                "message": f"unknown frame type: {typ!r}",
            }))
    except Exception as e:
        log.exception("command %s failed", typ)
        await ws.send_str(json.dumps({
            "type": "error", "code": "exception", "issue_id": issue_id,
            "message": str(e),
        }))


async def handle_send(state: AppState, sess: AgentSession, text: str) -> None:
    if not text or not sess.tmux_target:
        return
    # Hold the tmux lock across the entire send + capture + optional-second-Enter
    # sequence so two clients sending simultaneously don't interleave keys at
    # command granularity. capture-pane between the writes IS the consistency
    # check the two-Enter quirk relies on — splitting the lock would defeat it.
    async with state.tmux_lock:
        await send_text(sess.tmux_target, text)
        await asyncio.sleep(0.1)
        after = await capture_pane(sess.tmux_target, lines=10)
        has_spinner = any(c in after for c in SPINNER_CHARS)
        if (not has_spinner) and text in after:
            await send_enter(sess.tmux_target)
    await refresh_one(state, sess)


async def handle_quit(state: AppState, sess: AgentSession) -> None:
    if not sess.tmux_target:
        return
    async with state.tmux_lock:
        await send_quit(sess.tmux_target)
    await refresh_one(state, sess)


async def handle_close_pane(state: AppState, sess: AgentSession, ws) -> None:
    if not state.iterm.available:
        await ws.send_str(json.dumps({
            "type": "error", "code": "iterm_unavailable", "issue_id": sess.issue_id,
            "message": "iTerm Python API unavailable — close the pane manually.",
        }))
        return
    closed = await state.iterm.close_pane(sess.issue_id)
    if not closed:
        await ws.send_str(json.dumps({
            "type": "error", "code": "no_pane", "issue_id": sess.issue_id,
            "message": "no iTerm pane is associated with this issue.",
        }))


async def handle_reveal(_state: AppState, sess: AgentSession) -> None:
    url = f"obsidian://op-attach-current?id={sess.issue_id}"
    proc = await asyncio.create_subprocess_exec("open", url)
    await proc.wait()


# ---- Reconciler / poll loop -----------------------------------------------

async def reconcile(state: AppState) -> Tuple[List[AgentSession], List[AgentSession], List[str]]:
    """Build the in-memory session map from tmux + iTerm + data.json."""
    tmux_rows = await list_op_agent_windows()
    iterm_map = await state.iterm.scan()
    data_json_map: Dict[str, dict] = {}
    for path in find_data_json_paths():
        for issue_id, ref in read_orchestrator_state(path).items():
            data_json_map.setdefault(issue_id, ref)

    seen: Set[str] = set()
    added: List[AgentSession] = []
    updated: List[AgentSession] = []
    now = time.time()
    now_mono = time.monotonic()

    issue_to_target: Dict[str, str] = {}
    for session_name, window_name in tmux_rows:
        # tmuxWindowName(issueId) == slugify(issueId, {allowUnderscore: true}).
        # For canonical ids like `OP-217`, slug == id; the literal window
        # name is the issue id when iTerm hasn't tagged the session.
        issue_id = window_name
        issue_to_target[issue_id] = f"{session_name}:{window_name}"

    for issue_id, target in issue_to_target.items():
        seen.add(issue_id)
        # Prefer iTerm's canonical id if it case-insensitively matches.
        canonical = next(
            (k for k in iterm_map if k.lower() == issue_id.lower()),
            issue_id,
        )
        ref = data_json_map.get(canonical, {})
        agent_id, model, workdir, started_at = extract_agent_meta(ref)
        candidate = AgentSession(
            issue_id=canonical,
            iterm_session_id=iterm_map.get(canonical),
            tmux_target=target,
            agent_id=agent_id,
            model=model,
            workdir=workdir,
            started_at=started_at,
            stale=False,
        )
        is_new, sess = state.registry.upsert(candidate)
        if is_new:
            sess.started_at = sess.started_at or now
            added.append(sess)
        else:
            updated.append(sess)

    # iTerm-only sessions (tmux window gone): mark stale + exited.
    for issue_id, uuid in iterm_map.items():
        if issue_id in seen:
            continue
        sess = state.registry.get(issue_id)
        if sess is None:
            sess = AgentSession(
                issue_id=issue_id,
                iterm_session_id=uuid,
                tmux_target="",
                stale=True,
                state="exited",
            )
            sess.started_at = now
            sess._exited_at_mono = now_mono
            state.registry.upsert(sess)
            added.append(sess)
        else:
            sess.iterm_session_id = uuid
            sess.stale = True
            sess.state = "exited"
            if sess._exited_at_mono is None:
                sess._exited_at_mono = now_mono
            updated.append(sess)

    # Remove tmux+iterm-orphaned sessions after grace window.
    removed: List[str] = []
    for issue_id, sess in list(state.registry.sessions.items()):
        gone_from_tmux = issue_id not in issue_to_target
        gone_from_iterm = issue_id not in iterm_map
        if gone_from_tmux and gone_from_iterm:
            if sess._exited_at_mono is None:
                sess._exited_at_mono = now_mono
                sess.state = "exited"
                if sess not in updated:
                    updated.append(sess)
            elif now_mono - sess._exited_at_mono > EXITED_GRACE_S:
                state.registry.remove(issue_id)
                removed.append(issue_id)

    return added, updated, removed


async def refresh_one(state: AppState, sess: AgentSession) -> None:
    """Recapture pane + reclassify state for a single session."""
    if not sess.tmux_target:
        return
    capture = await capture_pane(sess.tmux_target)
    capture_hash = hash(capture)
    now = time.time()
    now_mono = time.monotonic()
    if capture_hash != sess._last_capture_hash and capture:
        sess.last_activity = now            # for client serialization
        sess._last_activity_mono = now_mono  # for liveness threshold
        sess._last_capture_hash = capture_hash
    sess.last_capture = "\n".join(capture.splitlines()[-CAPTURE_DISPLAY_LINES:])
    # Compute idle/running threshold against monotonic so a wall-clock jump
    # (NTP, manual clock change) can't pin a session at "running" forever
    # via a negative delta.
    last_age = (now_mono - sess._last_activity_mono) if sess._last_activity_mono else 9999.0
    classifier = AGENT_CLASSIFIERS.get(sess.agent_id, CLAUDE_CLASSIFIER)
    sess.state = classify_state(capture, last_age, classifier)
    sess.context_pct = extract_context_pct(capture, classifier)
    await state.hub.broadcast({"type": "session_updated", "session": sess.to_json()})


async def poll_loop(state: AppState) -> None:
    while not state.shutdown_event.is_set():
        try:
            added, _updated, removed = await reconcile(state)
            for sess in added:
                await state.hub.broadcast({"type": "session_added", "session": sess.to_json()})
            for sess in state.registry.values():
                if sess.tmux_target:
                    await refresh_one(state, sess)
            for issue_id in removed:
                await state.hub.broadcast({"type": "session_removed", "issue_id": issue_id})
        except Exception:
            log.exception("poll loop iteration failed")
        try:
            await asyncio.wait_for(state.shutdown_event.wait(), timeout=POLL_INTERVAL_S)
        except asyncio.TimeoutError:
            pass


# ---- main ------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="op-dashboard daemon")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--no-iterm", action="store_true",
                        help="Skip iTerm Python API (force tmux-only mode).")
    return parser


async def run(args: argparse.Namespace, connection: Any = None) -> int:
    # Single-instance probe — fail-fast if another daemon already owns the port.
    probe = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        try:
            probe.bind((args.host, args.port))
        except OSError as e:
            if e.errno in (errno.EADDRINUSE, errno.EACCES):
                log.error("port %d already in use — another op-dashboard is running.", args.port)
                return 0
            raise
    finally:
        probe.close()

    try:
        from aiohttp import web
    except ImportError:
        log.error("aiohttp not installed in iTerm's bundled Python runtime — rerun the dashboard installer and restart iTerm.")
        return 1

    state = AppState(
        token=generate_token(),
        started_at=time.time(),
        registry=SessionRegistry(),
        hub=Hub(),
        iterm=ITermBridge(),
    )
    write_token(TOKEN_PATH, state.token)
    log.info("token written to %s (mode 0600)", TOKEN_PATH)

    if not args.no_iterm:
        await state.iterm.start(connection)

    app = build_app(state)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, args.host, args.port)
    await site.start()
    log.info("op-dashboard %s listening on %s:%d", VERSION, args.host, args.port)

    state.poll_task = asyncio.create_task(poll_loop(state))

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        with contextlib.suppress(NotImplementedError):
            loop.add_signal_handler(sig, lambda: state.shutdown_event.set())
    await state.shutdown_event.wait()
    log.info("shutdown signal received — stopping.")
    if state.poll_task:
        state.poll_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await state.poll_task
    await state.hub.shutdown()
    await runner.cleanup()
    return 0


async def autolaunch_main(connection: Any) -> None:
    setup_logging()
    args = build_parser().parse_args([])
    rc = await run(args, connection=connection)
    if rc != 0:
        raise SystemExit(rc)


def should_autolaunch(argv0: str, argv: List[str]) -> bool:
    return Path(argv0).resolve().parent == AUTOLAUNCH_DIR and len(argv) == 1


def main() -> int:
    if sys.platform != "darwin":
        setup_logging()
        log.error("op-dashboard is macOS-only (platform=%s) — exiting.", sys.platform)
        return 0
    args = build_parser().parse_args()
    setup_logging()
    return asyncio.run(run(args))


if __name__ == "__main__":
    if should_autolaunch(sys.argv[0], sys.argv):
        if iterm2 is None:
            setup_logging()
            log.error("iterm2 Python package unavailable in AutoLaunch environment.")
            sys.exit(1)
        iterm2.run_forever(autolaunch_main)
    else:
        sys.exit(main())
