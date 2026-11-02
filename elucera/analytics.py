"""Run analytics: per-job rollups + fleet summary for efficiency tracking.

Every pipeline run already logs timestamped events to outputs/<id>/events.jsonl;
this module folds one job into a rollup row (analytics/jobs.jsonl) and serves
aggregates: stage timings, per-renderer success/fallback rates, error hotspots.
All reads tolerate missing/partial files — analytics must never break a job.
"""

import json
import time
from pathlib import Path

from elucera.config import get_settings


def _dir() -> Path:
    d = get_settings().analytics_dir
    d.mkdir(parents=True, exist_ok=True)
    return d


def rollup_job(job_id: str) -> dict | None:
    """Fold one finished job dir into a metrics row. None when unreadable."""
    from elucera.models import JobState

    d = get_settings().outputs_dir / job_id
    try:
        job = JobState.model_validate_json((d / "state.json").read_text())
    except (OSError, ValueError):
        return None
    events = []
    ef = d / "events.jsonl"
    if ef.exists():
        for line in ef.read_text().splitlines():
            try:
                events.append(json.loads(line))
            except ValueError:
                continue
    stages: dict[str, float] = {}
    order = ["script", "voice", "align", "plan", "render", "assemble"]
    marks = [(e["t"], e.get("stage")) for e in events if e.get("type") == "stage" and e.get("stage") in order]
    end_t = job.finished or (events[-1]["t"] if events else job.created)
    for k, (t, name) in enumerate(marks):
        nxt = marks[k + 1][0] if k + 1 < len(marks) else end_t
        stages[name] = round(max(0.0, nxt - t), 2)
    scenes: dict[str, dict] = {}
    render_events = [e for e in events if e.get("type") == "scene"]
    for r in ["manim", "remotion", "three"]:
        tries = [e for e in render_events if e.get("renderer") == r and e.get("status") in ("coding", "rendering")]
        scenes[r] = {
            "scenes": len({e.get("index") for e in render_events if e.get("renderer") == r}),
            "attempts": len(tries),
            "done": sum(1 for e in render_events if e.get("renderer") == r and e.get("status") == "done"),
            "fallback": sum(1 for e in render_events if e.get("renderer") == r and e.get("status") == "fallback"),
        }
    errors: dict[str, int] = {}
    for e in events:
        if e.get("type") in ("scene", "failed") and e.get("error"):
            key = f"{e.get('stage') or e.get('type')}: {str(e['error']).splitlines()[0][:80]}"
            errors[key] = errors.get(key, 0) + 1
    voice = next((e for e in events if e.get("type") == "voice"), {})
    return {
        "id": job_id, "topic": job.topic[:120], "status": job.status.value,
        "created": job.created, "finished": job.finished,
        "total_s": round(max(0.0, (job.finished or time.time()) - job.created), 1),
        "stages": stages, "scenes": scenes, "errors": errors,
        "voice": {"provider": voice.get("provider", "?"), "duration": voice.get("duration", 0)},
        "thread_id": getattr(job, "thread_id", None),
    }


def record_job(job_id: str) -> dict | None:
    """Append one job's rollup. Best-effort: never raises."""
    try:
        row = rollup_job(job_id)
        if row is None:
            return None
        with open(_dir() / "jobs.jsonl", "a") as f:
            f.write(json.dumps(row, default=str) + "\n")
        return row
    except Exception:
        return None


def _rows() -> list[dict]:
    f = _dir() / "jobs.jsonl"
    if not f.exists():
        return []
    out = []
    for line in f.read_text().splitlines():
        try:
            out.append(json.loads(line))
        except ValueError:
            continue
    return out


def summary() -> dict:
    """Fleet aggregates for the stats UI."""
    rows = _rows()
    done = [r for r in rows if r.get("status") == "done"]
    failed = [r for r in rows if r.get("status") == "failed"]
    stage_tot: dict[str, float] = {}
    stage_n: dict[str, int] = {}
    for r in rows:
        for name, secs in (r.get("stages") or {}).items():
            stage_tot[name] = stage_tot.get(name, 0.0) + secs
            stage_n[name] = stage_n.get(name, 0) + 1
    renderers: dict[str, dict] = {}
    for r in rows:
        for name, s in (r.get("scenes") or {}).items():
            agg = renderers.setdefault(name, {"scenes": 0, "attempts": 0, "done": 0, "fallback": 0})
            for k in agg:
                agg[k] += s.get(k, 0)
    for agg in renderers.values():
        agg["first_try_rate"] = round(agg["done"] / agg["scenes"], 3) if agg["scenes"] else None
    err_tot: dict[str, int] = {}
    for r in rows:
        for k, v in (r.get("errors") or {}).items():
            err_tot[k] = err_tot.get(k, 0) + v
    voice: dict[str, int] = {}
    for r in rows:
        p = (r.get("voice") or {}).get("provider", "?")
        voice[p] = voice.get(p, 0) + 1
    return {
        "jobs": len(rows), "done": len(done), "failed": len(failed),
        "success_rate": round(len(done) / len(rows), 3) if rows else None,
        "avg_total_s": round(sum(r.get("total_s", 0) for r in rows) / len(rows), 1) if rows else None,
        "avg_stage_s": {k: round(stage_tot[k] / stage_n[k], 1) for k in stage_tot},
        "renderers": renderers,
        "top_errors": sorted(err_tot.items(), key=lambda kv: kv[1], reverse=True)[:8],
        "voice_providers": voice,
    }
