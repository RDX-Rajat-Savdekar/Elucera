"""Pool of Gemini API keys, rotated as each one hits its quota.

Sticky: keeps using the current key until it fails. A key that hits its daily quota is parked until the reset
Gemini reports; an invalid key is parked for good. State is persisted (by key hash, never the key itself) so
restarts don't re-hit exhausted keys.
"""

import hashlib
import json
import threading
import time
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from elucera.config import get_settings
from elucera.fsutil import write_text_atomic

FOREVER = float("inf")


def key_id(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()[:10]


def next_pacific_midnight(now: float | None = None) -> float:
    """Gemini's free-tier daily quotas reset at midnight Pacific time."""
    tz = ZoneInfo("America/Los_Angeles")
    t = datetime.fromtimestamp(now or time.time(), tz)
    return (t + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0).timestamp()


class KeyPool:
    def __init__(self, keys: list[str], state_file: Path):
        self.keys = list(dict.fromkeys(k for k in keys if k))
        self.state_file = state_file
        self._lock = threading.Lock()
        self._state = self._load()

    def _load(self) -> dict:
        try:
            return json.loads(self.state_file.read_text())
        except (OSError, ValueError):
            return {"current": None, "keys": {}}

    def _save(self) -> None:
        self.state_file.parent.mkdir(parents=True, exist_ok=True)
        write_text_atomic(self.state_file, json.dumps(self._state, indent=2))

    def available(self, now: float | None = None) -> list[str]:
        """Usable keys, starting with the current (last good) one."""
        now = now or time.time()
        with self._lock:
            ok = [k for k in self.keys if self._state["keys"].get(key_id(k), {}).get("until", 0) <= now]
            cur = self._state.get("current")
            ok.sort(key=lambda k: key_id(k) != cur)
            return ok

    def _mark(self, key: str, **fields) -> None:
        with self._lock:
            self._state["keys"].setdefault(key_id(key), {}).update(fields)
            self._save()

    def good(self, key: str) -> None:
        with self._lock:
            self._state["current"] = key_id(key)
            entry = self._state["keys"].setdefault(key_id(key), {})
            entry.update(until=0, reason="", uses=entry.get("uses", 0) + 1, last_ok=int(time.time()))
            self._save()

    def exhausted(self, key: str, until: float, reason: str) -> None:
        self._mark(key, until=until, reason=reason)

    def invalid(self, key: str, reason: str) -> None:
        self._mark(key, until=FOREVER, reason=reason)

    def status(self, now: float | None = None) -> list[dict]:
        now = now or time.time()
        with self._lock:
            state = json.loads(json.dumps(self._state))  # snapshot, so concurrent updates can't tear a row
        out = []
        for i, k in enumerate(self.keys, 1):
            e = state["keys"].get(key_id(k), {})
            until = e.get("until", 0)
            out.append({
                "n": i,
                "id": key_id(k),
                "hint": f"…{k[-4:]}",
                "current": state.get("current") == key_id(k),
                "available": until <= now,
                "until": until,
                "reason": e.get("reason", ""),
                "uses": e.get("uses", 0),
            })
        return out


_pool: KeyPool | None = None


def get_pool() -> KeyPool:
    global _pool
    if _pool is None:
        s = get_settings()
        _pool = KeyPool(s.gemini_keys, s.outputs_dir / ".gemini_keys.json")
    return _pool
