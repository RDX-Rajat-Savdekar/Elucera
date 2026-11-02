"""Server-side chat threads: an ordered list of pitches and jobs, like an AI chat app history.

Threads are owned by an anonymous browser id (sent as the X-Elucera-User header), so each browser sees its own
history across reloads and server restarts without needing a login. Threads saved before ownership existed have
no owner and are visible to everyone.
"""

import json
import time
import uuid
from pathlib import Path

from elucera.config import get_settings

VALID = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.")


def _dir() -> Path:
    d = get_settings().chats_dir
    d.mkdir(parents=True, exist_ok=True)
    return d


def _check(tid: str) -> str:
    if not tid or len(tid) > 64 or any(c not in VALID for c in tid):
        raise ValueError("bad thread id")
    return tid


def _write(t: dict) -> dict:
    (_dir() / f"{t['id']}.json").write_text(json.dumps(t))
    return t


def _normalize(t: dict) -> dict:
    """Old threads only had `jobs`; expose everything as `items` too."""
    if "items" not in t:
        t["items"] = [{"kind": "job", "id": j, "topic": "", "renderer": None, "ts": t.get("updated", 0)}
                      for j in t.get("jobs", [])]
    t.setdefault("owner", None)
    return t


def visible(t: dict, owner: str | None) -> bool:
    return not t.get("owner") or not owner or t["owner"] == owner


def create(title: str, tid: str | None = None, owner: str | None = None) -> dict:
    tid = _check(tid or uuid.uuid4().hex[:12])
    now = time.time()
    return _write({"id": tid, "title": (title or "Untitled chat")[:120], "owner": owner, "created": now,
                   "updated": now, "jobs": [], "items": []})


def get(tid: str) -> dict | None:
    f = _dir() / f"{_check(tid)}.json"
    return _normalize(json.loads(f.read_text())) if f.exists() else None


def list_threads(owner: str | None = None) -> list[dict]:
    out = []
    for f in _dir().glob("*.json"):
        try:
            t = _normalize(json.loads(f.read_text()))
        except (ValueError, KeyError):
            continue
        if not visible(t, owner):
            continue
        out.append({"id": t["id"], "title": t.get("title", ""), "updated": t.get("updated", 0),
                    "jobs": len(t.get("jobs", [])), "items": len(t["items"])})
    return sorted(out, key=lambda t: t["updated"], reverse=True)


def _touch(tid: str, topic: str, owner: str | None) -> dict:
    t = get(tid)
    if t is None:
        t = create(topic or "Untitled chat", tid, owner)
    if owner and not t.get("owner"):
        t["owner"] = owner
    t["updated"] = time.time()
    if topic and t["title"] == "Untitled chat":
        t["title"] = topic[:120]
    return t


def attach(tid: str, job_id: str, topic: str = "", owner: str | None = None, renderer: str | None = None,
           pitch_id: str | None = None) -> dict:
    """Append a job to a thread (creating it if needed). If it came from a pitch, the pitch item becomes the job."""
    t = _touch(tid, topic, owner)
    if job_id not in t["jobs"]:
        t["jobs"].append(job_id)
    item = next((i for i in t["items"] if pitch_id and i["kind"] == "pitch" and i["id"] == pitch_id), None)
    if item:
        item.update(kind="job", id=job_id, pitch_id=pitch_id)
    elif not any(i["kind"] == "job" and i["id"] == job_id for i in t["items"]):
        t["items"].append({"kind": "job", "id": job_id, "topic": topic, "renderer": renderer, "ts": time.time()})
    return _write(t)


def attach_pitch(tid: str, pitch_id: str, topic: str, owner: str | None = None, renderer: str | None = None) -> dict:
    t = _touch(tid, topic, owner)
    if not any(i["kind"] == "pitch" and i["id"] == pitch_id for i in t["items"]):
        t["items"].append({"kind": "pitch", "id": pitch_id, "topic": topic, "renderer": renderer, "ts": time.time()})
    return _write(t)


def delete(tid: str, owner: str | None = None) -> bool:
    t = get(tid)
    if t is None or not visible(t, owner):
        return False
    (_dir() / f"{t['id']}.json").unlink()
    return True


def pitch_summary(pid: str) -> dict | None:
    f = get_settings().outputs_dir / "pitches" / pid / "pitch.json"
    if not pid.isalnum() or not f.exists():
        return None
    try:
        p = json.loads(f.read_text())
    except ValueError:
        return None
    return {"kind": "pitch", "id": pid, "topic": p.get("topic", ""), "status": p.get("status", ""),
            "renderer": p.get("renderer")}


def job_summary(job_id: str) -> dict | None:
    """Small card for a job, from its persisted state (no pipeline run)."""
    from elucera.models import JobState

    f = get_settings().outputs_dir / job_id / "state.json"
    if not f.exists():
        return None
    try:
        job = JobState.model_validate_json(f.read_text())
    except ValueError:
        return None
    renderers: list[str] = []
    rf = get_settings().outputs_dir / job_id / "results.json"
    if rf.exists():
        try:
            for r in json.loads(rf.read_text()):
                v = r.get("renderer")
                if v and v not in renderers:
                    renderers.append(v)
        except ValueError:
            pass
    return {"kind": "job", "id": job.id, "topic": job.topic, "status": job.status.value,
            "renderer": job.preferred_renderer.value if job.preferred_renderer else None,
            "renderers": renderers, "finished": job.finished,
            "has_video": bool(job.video and (get_settings().outputs_dir / job_id / "final.mp4").exists())}


def item_summaries(t: dict) -> list[dict]:
    """Each item in order, with its current status; items whose files are gone are dropped."""
    out = []
    for i in t["items"]:
        s = job_summary(i["id"]) if i["kind"] == "job" else pitch_summary(i["id"])
        if s:
            out.append({**s, "topic": s.get("topic") or i.get("topic", ""), "renderer": s.get("renderer") or i.get("renderer")})
    return out
