"""Per-job usage ledger: every model call appends one row to <job or pitch dir>/usage.jsonl.

The current sink (a directory) and purpose ("script", "plan", "scene2:code", ...) travel in context variables, so
they follow the work into LangGraph's worker threads without threading parameters through every function.
Recording is best-effort and never raises.
"""

import contextlib
import contextvars
import json
import threading
import time
from pathlib import Path

SINK: contextvars.ContextVar[Path | None] = contextvars.ContextVar("elucera_usage_sink", default=None)
PURPOSE: contextvars.ContextVar[str] = contextvars.ContextVar("elucera_usage_purpose", default="")
_lock = threading.Lock()
FILE = "usage.jsonl"


@contextlib.contextmanager
def sink(directory: Path):
    token = SINK.set(Path(directory))
    try:
        yield
    finally:
        SINK.reset(token)


@contextlib.contextmanager
def purpose(name: str):
    token = PURPOSE.set(name)
    try:
        yield
    finally:
        PURPOSE.reset(token)


def record(provider: str, model: str, **fields) -> None:
    d = SINK.get()
    if d is None:
        return
    row = {"t": round(time.time(), 2), "provider": provider, "model": model, "purpose": PURPOSE.get(), **fields}
    try:
        d.mkdir(parents=True, exist_ok=True)
        with _lock, open(d / FILE, "a") as f:
            f.write(json.dumps(row) + "\n")
    except OSError:
        pass


def read(directory: Path) -> list[dict]:
    f = Path(directory) / FILE
    if not f.exists():
        return []
    rows = []
    for line in f.read_text().splitlines():
        try:
            rows.append(json.loads(line))
        except ValueError:
            continue
    return rows
