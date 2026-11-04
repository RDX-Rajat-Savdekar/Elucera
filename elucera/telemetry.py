"""Product telemetry: lightweight local-first event log for product decisions.

Separate from pipeline analytics (analytics/jobs.jsonl = per-run timings,
usage.jsonl = model spend). This is the *product* funnel: page views, demo
interactions, gallery plays, pitch submits/approvals, redos, rebakes.

- File: analytics/telemetry.jsonl, one row per event.
- Never raises, never blocks a request, never stores raw prompts (lengths only).
- GET /analytics/telemetry aggregates counts for the dashboard.
"""

import json
import re
import threading
import time
from pathlib import Path

from elucera.config import get_settings

_lock = threading.Lock()
_NAME = re.compile(r"^[a-z0-9][a-z0-9_.\-]{0,63}$")
_MAX_PROPS = 24
_MAX_STR = 200


def _dir() -> Path:
    d = get_settings().analytics_dir
    d.mkdir(parents=True, exist_ok=True)
    return d


def _clean(props: dict) -> dict:
    out: dict = {}
    for k, v in list((props or {}).items()):
        if len(out) >= _MAX_PROPS:
            break
        key = str(k)[:40]
        if isinstance(v, str):
            out[key] = v[:_MAX_STR]
        elif isinstance(v, (int, float, bool)) or v is None:
            out[key] = v
        else:
            out[key] = str(v)[:_MAX_STR]
    return out


def record(event: str, props: dict | None = None, owner: str | None = None) -> None:
    """Append one telemetry event. Best-effort: never raises."""
    try:
        name = (event or "").strip().lower()
        if not _NAME.match(name):
            return
        row = {"t": round(time.time(), 2), "event": name,
               "owner": (owner or "")[:64], "props": _clean(props or {})}
        with _lock, open(_dir() / "telemetry.jsonl", "a") as f:
            f.write(json.dumps(row, default=str) + "\n")
    except OSError:
        pass


def _rows() -> list[dict]:
    f = _dir() / "telemetry.jsonl"
    if not f.exists():
        return []
    out = []
    try:
        for line in f.read_text().splitlines():
            try:
                out.append(json.loads(line))
            except ValueError:
                continue
    except OSError:
        return []
    return out


def summary(days: int = 14) -> dict:
    """Aggregate counts for the dashboard. Never raises."""
    try:
        rows = _rows()
        now = time.time()
        cutoff = now - days * 86400
        recent = [r for r in rows if r.get("t", 0) >= cutoff]
        by_event: dict[str, int] = {}
        for r in recent:
            e = r.get("event", "?")
            by_event[e] = by_event.get(e, 0) + 1
        # funnel: the product decisions we care about
        funnel_order = ["page_view", "demo_view", "demo_replay", "reel_play", "kit_play",
                        "pitch_submit", "pitch_approve", "scene_redo_submit",
                        "rebake_click", "video_serve"]
        funnel = {k: by_event.get(k, 0) for k in funnel_order}
        by_day: dict[str, int] = {}
        for r in recent:
            day = time.strftime("%Y-%m-%d", time.localtime(r.get("t", 0)))
            by_day[day] = by_day.get(day, 0) + 1
        owners = len({r.get("owner") for r in recent if r.get("owner")})
        return {"total": len(rows), "recent": len(recent), "days": days,
                "unique_browsers": owners, "by_event": dict(sorted(by_event.items(), key=lambda kv: -kv[1])[:30]),
                "funnel": funnel, "by_day": dict(sorted(by_day.items())),
                "latest": [{k: r.get(k) for k in ("t", "event", "props")} for r in rows[-20:][::-1]]}
    except Exception:
        return {"total": 0, "recent": 0, "days": days, "unique_browsers": 0,
                "by_event": {}, "funnel": {}, "by_day": {}, "latest": []}
