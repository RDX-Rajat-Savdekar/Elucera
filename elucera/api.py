import asyncio
import json
from contextlib import asynccontextmanager
import logging
import re
import threading
import time
import uuid
from pathlib import Path
from typing import Literal

from fastapi import BackgroundTasks, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from elucera.config import ROOT, get_settings
from elucera.models import JobState, JobStatus, Renderer, Script

log = logging.getLogger(__name__)
JOBS: dict[str, JobState] = {}
EVENTS: dict[str, list[dict]] = {}
PREFETCH: dict[str, threading.Event] = {}  # pitch id → set when its speculative voice + plan finished
_lock = threading.Lock()
_pitch_lock = threading.Lock()


class JobRequest(BaseModel):
    topic: str = Field(min_length=3, max_length=500)
    renderer: Renderer | None = Field(default=None, description="Preferred engine for every scene; null = director picks")
    thread_id: str | None = Field(default=None, max_length=64, description="Chat thread to file this job under")


class RetryRequest(BaseModel):
    note: str = Field(default="", max_length=500)
    renderer: Renderer | None = None
    description: str | None = Field(default=None, max_length=4000, description="Replacement animator prompt for this scene")
    library_scene: str | None = Field(default=None, max_length=64, description="Reuse this library scene's clip instead")


class TelemetryEvent(BaseModel):
    event: str = Field(min_length=1, max_length=80)
    props: dict = Field(default_factory=dict)


def _owner(request: Request) -> str | None:
    """Anonymous per-browser id from the UI; scopes chat history without a login."""
    v = (request.headers.get("x-elucera-user") or "").strip()
    return v if v and len(v) <= 64 and v.replace("-", "").isalnum() else None


# ---------- job + event persistence ----------

def _job_dir(job_id: str) -> Path:
    return get_settings().outputs_dir / job_id


def _persist(job: JobState) -> None:
    d = _job_dir(job.id)
    d.mkdir(parents=True, exist_ok=True)
    (d / "state.json").write_text(job.model_dump_json(indent=2))


def _load(job_id: str) -> JobState | None:
    if job_id in JOBS:
        return JOBS[job_id]
    if not job_id.isalnum():
        return None
    f = _job_dir(job_id) / "state.json"
    return JobState.model_validate(json.loads(f.read_text())) if f.exists() else None


def _events(job_id: str) -> list[dict]:
    with _lock:
        if job_id not in EVENTS:
            f = _job_dir(job_id) / "events.jsonl"
            EVENTS[job_id] = [json.loads(ln) for ln in f.read_text().splitlines() if ln.strip()] if f.exists() else []
        return EVENTS[job_id]


def _emitter(job: JobState):
    """emit(type, **data): append to the job's event log (memory + events.jsonl) and keep JobState in sync."""
    events = _events(job.id)
    path = _job_dir(job.id) / "events.jsonl"

    def emit(type: str, **data) -> None:
        with _lock:
            ev = {"seq": len(events), "t": round(time.time(), 2), "type": type, **data}
            events.append(ev)
            with open(path, "a") as f:
                f.write(json.dumps(ev, default=str) + "\n")
        if type == "stage":
            job.stage = data["label"]
            job.log.append(data["stage"])
            _persist(job)

    return emit


def _friendly(e: Exception) -> str:
    msg = str(e)
    if "RESOURCE_EXHAUSTED" in msg or " 429" in msg:
        return "The voice service hit its rate limit. Wait a minute and try again."
    if "MUSE" in msg or "api.meta.ai" in msg:
        return "The script model (Muse) is unavailable right now. Try again shortly."
    return msg.splitlines()[0][:300] if msg else e.__class__.__name__


TRANSIENT = re.compile(r"RESOURCE_EXHAUSTED|\b429\b|\b50[234]\b|timed? ?out|timeout|connection|unavailable|"
                       r"temporarily|overloaded|api\.meta\.ai|MUSE", re.I)


def _transient(e: Exception) -> bool:
    """Errors worth one automatic retry: network blips, rate limits, model outages (not bugs in our code)."""
    return isinstance(e, (TimeoutError, ConnectionError)) or bool(TRANSIENT.search(f"{e.__class__.__name__} {e}"))


def _resumable(job: JobState) -> bool:
    return (_job_dir(job.id) / "topic.txt").exists()


def _execute(job: JobState, work, retry=None) -> None:
    """Run `work(emit)` for a job, recording success/failure as events.

    On a transient failure, `retry(emit)` (normally a resume from the failed step) runs once automatically.
    """
    from elucera import usage

    with usage.sink(_job_dir(job.id)):
        _execute_inner(job, work, retry)


def _execute_inner(job: JobState, work, retry=None) -> None:
    emit = _emitter(job)
    job.status, job.error = JobStatus.running, ""
    _persist(job)
    try:
        try:
            out = work(emit)
        except Exception as e:
            if retry is None or not _transient(e) or not _resumable(job):
                raise
            log.warning("job %s hit a transient error, retrying once: %s", job.id, e)
            emit("auto_retry", stage=job.log[-1] if job.log else "", error=_friendly(e),
                 delay=get_settings().auto_retry_delay_s)
            time.sleep(get_settings().auto_retry_delay_s)
            out = retry(emit)
        job.video = out if out else job.video
        job.status = JobStatus.done
    except Exception as e:
        log.exception("job %s failed", job.id)
        job.status, job.error = JobStatus.failed, _friendly(e)
        emit("failed", stage=job.log[-1] if job.log else "", error=job.error, detail=str(e)[-2000:],
             resumable=_resumable(job))
    job.finished = time.time()
    _persist(job)
    try:
        from elucera import analytics
        analytics.record_job(job.id)
    except Exception:
        pass  # analytics must never break a job


def _mark_orphans() -> None:
    """Jobs left running by a previous server process will never finish; say so instead of spinning forever."""
    for f in get_settings().outputs_dir.glob("*/state.json"):
        job = JobState.model_validate_json(f.read_text())
        if job.status in (JobStatus.queued, JobStatus.running):
            job.status, job.error, job.finished = JobStatus.failed, "Interrupted by a server restart. Resume to continue where it stopped.", time.time()
            _persist(job)
            _emitter(job)("failed", stage=job.log[-1] if job.log else "", error=job.error, detail="",
                          resumable=_resumable(job))


@asynccontextmanager
async def _lifespan(_app: FastAPI):
    _mark_orphans()
    yield


app = FastAPI(title="elucera", lifespan=_lifespan)


# ---------- jobs ----------

@app.post("/jobs", status_code=202)
def create_job(req: JobRequest, background: BackgroundTasks, request: Request) -> JobState:
    from elucera import telemetry
    from elucera.graph import resume, run

    telemetry.record("job_create", {"topic_len": len(req.topic.strip()),
                                    "engine": req.renderer.value if req.renderer else "auto"},
                     owner=_owner(request))
    job = JobState(id=uuid.uuid4().hex[:12], topic=req.topic.strip(), preferred_renderer=req.renderer,
                   thread_id=(req.thread_id or None), created=time.time())
    JOBS[job.id] = job
    _persist(job)
    if job.thread_id:
        try:
            from elucera import chats
            chats.attach(job.thread_id, job.id, job.topic, owner=_owner(request),
                         renderer=req.renderer.value if req.renderer else None)
        except (ValueError, OSError):
            job.thread_id = None
            _persist(job)
    _emitter(job)("queued", topic=job.topic,
                  renderer=req.renderer.value if req.renderer else None)
    background.add_task(_execute, job, lambda emit: run(job.topic, _job_dir(job.id), emit,
                                                        preferred_renderer=(req.renderer.value if req.renderer else None)),
                        lambda emit: resume(_job_dir(job.id), emit))
    return job


@app.get("/jobs/{job_id}")
def get_job(job_id: str) -> JobState:
    job = _load(job_id)
    if not job:
        raise HTTPException(404, "job not found")
    return job


@app.get("/jobs/{job_id}/events")
async def stream_events(job_id: str, request: Request, after: int = -1):
    """Server-sent events: replays the job's event log after `after`, then streams new ones until it finishes."""
    if not _load(job_id):
        raise HTTPException(404, "job not found")
    last_id = request.headers.get("last-event-id")
    start = int(last_id) + 1 if last_id and last_id.isdigit() else after + 1

    async def gen():
        i, idle = start, 0.0
        yield "retry: 2000\n\n"
        while True:
            events = _events(job_id)
            while i < len(events):
                yield f"id: {i}\ndata: {json.dumps(events[i], default=str)}\n\n"
                i += 1
                idle = 0.0
            job = _load(job_id)
            if job and job.status in (JobStatus.done, JobStatus.failed) and i >= len(_events(job_id)):
                yield f"event: end\ndata: {json.dumps({'status': job.status.value})}\n\n"
                return
            if await request.is_disconnected():
                return
            await asyncio.sleep(0.3)
            idle += 0.3
            if idle >= 15:
                yield ": keep-alive\n\n"
                idle = 0.0

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.get("/jobs/{job_id}/details")
def get_job_details(job_id: str) -> dict:
    if not _load(job_id):
        raise HTTPException(404, "job not found")
    d = _job_dir(job_id)
    read = lambda n: json.loads((d / n).read_text()) if (d / n).exists() else None  # noqa: E731
    return {"script": read("script.json"), "plan": read("plan.json"), "results": read("results.json")}


@app.get("/jobs/{job_id}/video")
def get_video(job_id: str, request: Request) -> FileResponse:
    from elucera import telemetry

    job = _load(job_id)
    if not job or not job.video or not Path(job.video).exists():
        raise HTTPException(404, "video not ready")
    telemetry.record("video_serve", {"job": job_id}, owner=_owner(request))
    return FileResponse(job.video, media_type="video/mp4", filename=f"reel-{job_id}.mp4",
                        headers={"Cache-Control": "no-store"})


@app.get("/jobs/{job_id}/scenes/{index}/clip")
def get_scene_clip(job_id: str, index: int, version: int | None = None) -> FileResponse:
    """The scene's current clip, or an earlier version kept by a redo (`?version=n`)."""
    f = _job_dir(job_id) / (f"seg{index}.v{version}.mp4" if version else f"seg{index}.mp4")
    if not _load(job_id) or not f.exists():
        raise HTTPException(404, "scene not rendered")
    return FileResponse(f, media_type="video/mp4", headers={"Cache-Control": "no-store"})


def _player_bundle(job_id: str, index: int) -> Path:
    f = _job_dir(job_id) / f"seg{index}.player.js"
    if not _load(job_id) or not f.exists():
        raise HTTPException(404, "no interactive preview for this scene")
    return f


@app.get("/jobs/{job_id}/scenes/{index}/player")
def get_scene_player(job_id: str, index: int) -> HTMLResponse:
    from elucera.render.player_bundle import player_page

    _player_bundle(job_id, index)
    job = _load(job_id)
    return HTMLResponse(player_page(job.topic if job else f"scene {index}"))


@app.get("/jobs/{job_id}/scenes/{index}/player.js")
def get_scene_player_js(job_id: str, index: int) -> FileResponse:
    return FileResponse(_player_bundle(job_id, index), media_type="application/javascript",
                        headers={"Cache-Control": "no-store"})


def _idle_job(job_id: str) -> JobState:
    job = _load(job_id)
    if not job:
        raise HTTPException(404, "job not found")
    if job.status in (JobStatus.running, JobStatus.queued) and job.id in JOBS:
        raise HTTPException(409, "job is still running")
    return job


@app.post("/jobs/{job_id}/scenes/{index}/retry", status_code=202)
def retry_scene(job_id: str, index: int, req: RetryRequest, background: BackgroundTasks, request: Request) -> JobState:
    """Regenerate one scene (with a note, an edited prompt, another engine, or a library clip).

    Only that scene is rebuilt; the reel is NOT reassembled until POST /jobs/{id}/rebake, so several scenes can be
    redone and compared first.
    """
    from elucera.graph import retry_scene as do_retry

    job = _idle_job(job_id)
    d = _job_dir(job_id)
    if not (d / "plan.json").exists() or not (d / "audio.json").exists():
        raise HTTPException(409, "this job never reached the scene stage; resume or start a new one")
    plan = json.loads((d / "plan.json").read_text())
    if not 0 <= index < len(plan):
        raise HTTPException(404, "no such scene")
    JOBS[job.id] = job
    renderer = req.renderer.value if req.renderer else None
    try:
        from elucera import telemetry
        telemetry.record("scene_retry", {"job": job_id, "scene": index,
                                        "engine": renderer or plan[index]["renderer"],
                                        "edited": bool(req.description),
                                        "note": bool(req.note),
                                        "library": bool(req.library_scene)},
                         owner=_owner(request))
    except Exception:
        pass
    _emitter(job)("retry", index=index, note=req.note, renderer=renderer or plan[index]["renderer"],
                  edited=bool(req.description), library_scene=req.library_scene)
    background.add_task(_execute, job, lambda emit: do_retry(d, index, req.note, renderer, emit,
                                                             description=req.description, library_scene=req.library_scene))
    job.status = JobStatus.running
    return job


@app.get("/jobs/{job_id}/scenes/{index}/history")
def scene_history(job_id: str, index: int) -> list[dict]:
    from elucera.graph import history

    if not _load(job_id):
        raise HTTPException(404, "job not found")
    return history(_job_dir(job_id), index)


@app.post("/jobs/{job_id}/scenes/{index}/revert")
def revert_scene(job_id: str, index: int) -> dict:
    from elucera.graph import revert_scene as do_revert

    job = _idle_job(job_id)
    try:
        return do_revert(_job_dir(job_id), index, _emitter(job))
    except ValueError as e:
        raise HTTPException(409, str(e))


@app.get("/jobs/{job_id}/scenes/{index}/similar")
def similar_scenes(job_id: str, index: int, renderer: Renderer | None = None) -> list[dict]:
    """Library scenes that could stand in for this one (no generation needed)."""
    from elucera import library
    from elucera.models import SceneSpec

    f = _job_dir(job_id) / "plan.json"
    if not _load(job_id) or not f.exists():
        raise HTTPException(404, "job not found")
    plan = json.loads(f.read_text())
    if not 0 <= index < len(plan):
        raise HTTPException(404, "no such scene")
    spec = SceneSpec.model_validate(plan[index])
    if renderer:
        spec.renderer = renderer
    return [{"id": m.id, "renderer": m.renderer.value, "topic": m.topic, "role": m.role,
             "description": m.description[:220], "duration": m.duration}
            for m, _code in library.similar(spec, k=8, max_chars=10**9)
            # a job's own scenes are already in it; only offer genuinely different clips
            if m.source != job_id and (get_settings().library_dir / "scenes" / m.id / "clip.mp4").exists()][:3]


@app.post("/jobs/{job_id}/rebake", status_code=202)
def rebake_job(job_id: str, background: BackgroundTasks, request: Request) -> JobState:
    """Reassemble the reel from the current scene clips (after redos)."""
    from elucera import telemetry
    from elucera.graph import load_job, rebake

    telemetry.record("rebake", {"job": job_id}, owner=_owner(request))
    job = _idle_job(job_id)
    d = _job_dir(job_id)
    try:
        _, _, specs, results = load_job(d)
    except FileNotFoundError:
        raise HTTPException(409, "this job has no scenes to bake yet; resume it first")
    if {s.index for s in specs} - {r.index for r in results}:
        raise HTTPException(409, "some scenes are not rendered yet; resume the job first")
    JOBS[job.id] = job
    _emitter(job)("rebake", scenes=len(specs))
    background.add_task(_execute, job, lambda emit: rebake(d, emit))
    job.status = JobStatus.running
    return job


@app.post("/jobs/{job_id}/resume", status_code=202)
def resume_job(job_id: str, background: BackgroundTasks, request: Request) -> JobState:
    """Continue a failed or interrupted job from the first missing step, reusing what's already done."""
    from elucera import telemetry
    from elucera.graph import resume

    telemetry.record("resume", {"job": job_id}, owner=_owner(request))
    job = _idle_job(job_id)
    if job.status == JobStatus.done:
        raise HTTPException(409, "job already finished")
    if not _resumable(job):
        raise HTTPException(409, "nothing saved to resume from; start over")
    JOBS[job.id] = job
    background.add_task(_execute, job, lambda emit: resume(_job_dir(job_id), emit))
    job.status = JobStatus.running
    return job


# ---------- library (samples for the home page) ----------

def _reel_dir(name: str) -> Path:
    root = (get_settings().library_dir / "reels").resolve()
    d = (root / name).resolve()
    if d.parent != root or not d.is_dir():
        raise HTTPException(404, "reel not found")
    return d


class ThreadCreate(BaseModel):
    title: str = Field(default="Untitled chat", max_length=120)


class ThreadAttach(BaseModel):
    job_id: str = Field(min_length=3, max_length=64)


class PitchRequest(BaseModel):
    topic: str = Field(min_length=3, max_length=500)
    renderer: Renderer | None = None
    target_length: Literal["short", "standard", "deep"] = "standard"
    thread_id: str | None = Field(default=None, max_length=64)
    note: str = Field(default="", max_length=2000, description="Director's note, e.g. use a timeline view")


class PitchApprove(BaseModel):
    script: Script | None = None
    renderer: Renderer | None = None
    thread_id: str | None = Field(default=None, max_length=64)
    note: str | None = Field(default=None, max_length=2000)


def _pitch_dir(pid: str) -> Path:
    return get_settings().outputs_dir / "pitches" / pid


def _update_pitch(pid: str, **fields) -> dict:
    """Read-modify-write pitch.json under a lock (the prefetch and approval both touch it)."""
    f = _pitch_dir(pid) / "pitch.json"
    with _pitch_lock:
        pitch = json.loads(f.read_text())
        pitch.update(fields)
        f.write_text(json.dumps(pitch, default=str))
    return pitch


def _run_pitch(pid: str, req: PitchRequest) -> None:
    """Script-only pass: cheap first iteration for director review, then speculative voice + plan."""
    from elucera import usage
    from elucera.agents.script import write_script
    from elucera.graph import LENGTH_HINTS
    from elucera.llm import MuseClient

    d = _pitch_dir(pid)
    with usage.sink(d):
        try:
            hint = LENGTH_HINTS.get(req.target_length, "")
            with usage.purpose("pitch"):
                script = write_script(MuseClient(), req.topic.strip() + hint)
        except Exception as e:
            log.exception("pitch %s failed", pid)
            _update_pitch(pid, status="failed", error=_friendly(e))
            return
        if not get_settings().prefetch_on_pitch:
            _update_pitch(pid, status="ready", script=script.model_dump())
            return
        PREFETCH[pid] = threading.Event()
        _update_pitch(pid, status="ready", script=script.model_dump(), prefetch="running")
        _prefetch(pid, script, req.note or "", req.renderer.value if req.renderer else None)


def _prefetch(pid: str, script: Script, note: str, preferred: str | None) -> None:
    from elucera import usage
    from elucera.graph import prefetch

    started = time.time()
    try:
        with usage.purpose("prefetch"):
            prefetch(_pitch_dir(pid) / "prefetch", script, note, preferred)
        _update_pitch(pid, prefetch="ready", prefetch_s=round(time.time() - started, 1))
    except Exception as e:  # speculative work: failures only mean the real run does it instead
        log.warning("prefetch for pitch %s failed: %s", pid, e)
        _update_pitch(pid, prefetch="failed", prefetch_error=_friendly(e))
    finally:
        PREFETCH.pop(pid, threading.Event()).set()


@app.post("/pitches", status_code=202)
def create_pitch(req: PitchRequest, background: BackgroundTasks, request: Request) -> dict:
    from elucera import telemetry

    telemetry.record("pitch_submit", {"topic_len": len(req.topic.strip()),
                                     "engine": req.renderer.value if req.renderer else "auto",
                                     "target_length": req.target_length},
                     owner=_owner(request))
    pid = uuid.uuid4().hex[:12]
    d = _pitch_dir(pid)
    d.mkdir(parents=True, exist_ok=True)
    pitch = {"id": pid, "topic": req.topic.strip(), "status": "writing",
             "renderer": req.renderer.value if req.renderer else None,
             "target_length": req.target_length, "note": req.note or "",
             "created": time.time(), "script": None, "error": "", "thread_id": req.thread_id or None}
    # Written before returning so the UI's first poll never 404s.
    (d / "pitch.json").write_text(json.dumps(pitch))
    if req.thread_id:
        try:
            from elucera import chats
            chats.attach_pitch(req.thread_id, pid, pitch["topic"], owner=_owner(request), renderer=pitch["renderer"])
        except (ValueError, OSError):
            pass
    background.add_task(_run_pitch, pid, req)
    return pitch


@app.get("/pitches/{pid}")
def get_pitch(pid: str) -> dict:
    if not pid.isalnum():
        raise HTTPException(404, "unknown pitch")
    f = _pitch_dir(pid) / "pitch.json"
    if not f.exists():
        raise HTTPException(404, "unknown pitch")
    return json.loads(f.read_text())


@app.post("/pitches/{pid}/approve", status_code=202)
def approve_pitch(pid: str, req: PitchApprove, background: BackgroundTasks, request: Request) -> JobState:
    from elucera import telemetry
    from elucera.graph import resume, run_approved

    telemetry.record("pitch_approve", {"pitch": pid,
                                      "engine": req.renderer.value if req.renderer else "auto"},
                     owner=_owner(request))

    if not pid.isalnum():
        raise HTTPException(404, "unknown pitch")
    f = _pitch_dir(pid) / "pitch.json"
    if not f.exists():
        raise HTTPException(404, "unknown pitch")
    pitch = json.loads(f.read_text())
    if pitch.get("status") != "ready" or not pitch.get("script"):
        raise HTTPException(409, "pitch is not ready for review yet")
    script = Script.model_validate(req.script) if req.script else Script.model_validate(pitch["script"])
    renderer = req.renderer or (Renderer(pitch["renderer"]) if pitch.get("renderer") else None)
    thread_id = req.thread_id or None
    note = req.note if req.note is not None else pitch.get("note", "")
    job = JobState(id=uuid.uuid4().hex[:12], topic=pitch["topic"], preferred_renderer=renderer,
                   thread_id=thread_id, created=time.time())
    JOBS[job.id] = job
    _persist(job)
    if thread_id:
        try:
            from elucera import chats
            chats.attach(thread_id, job.id, job.topic, owner=_owner(request),
                         renderer=renderer.value if renderer else None, pitch_id=pid)
        except (ValueError, OSError):
            job.thread_id = None
            _persist(job)
    unchanged = (script.model_dump() == pitch["script"] and (note or "") == (pitch.get("note") or "")
                 and (renderer.value if renderer else None) == pitch.get("renderer"))
    _update_pitch(pid, job_id=job.id, approved_script=script.model_dump())
    emit = _emitter(job)
    emit("queued", topic=job.topic, renderer=renderer.value if renderer else None, pitch=pid)
    (_job_dir(job.id) / "pitch_id.txt").write_text(pid)

    def wait_for_prefetch() -> None:
        ev = PREFETCH.get(pid)
        if ev and not ev.is_set() and unchanged:
            emit("prefetch_wait")
            ev.wait(timeout=300)

    background.add_task(_execute, job, lambda emit: run_approved(
        job.topic, _job_dir(job.id), script, emit,
        preferred_renderer=(renderer.value if renderer else None), note=note or "", wait_for=wait_for_prefetch),
        lambda emit: resume(_job_dir(job.id), emit))
    return job


@app.post("/chats", status_code=201)
def create_thread(req: ThreadCreate, request: Request) -> dict:
    from elucera import chats
    return chats.create(req.title, owner=_owner(request))


@app.get("/chats")
def list_threads(request: Request) -> list[dict]:
    from elucera import chats
    return chats.list_threads(_owner(request))


def _thread(thread_id: str, request: Request) -> dict:
    from elucera import chats
    try:
        t = chats.get(thread_id)
    except ValueError:
        raise HTTPException(404, "unknown chat")
    if t is None or not chats.visible(t, _owner(request)):
        raise HTTPException(404, "unknown chat")
    return t


@app.get("/chats/{thread_id}")
def get_thread(thread_id: str, request: Request) -> dict:
    from elucera import chats
    t = _thread(thread_id, request)
    items = chats.item_summaries(t)
    return {**t, "items": items, "summaries": [i for i in items if i["kind"] == "job"]}


@app.delete("/chats/{thread_id}", status_code=204)
def delete_thread(thread_id: str, request: Request) -> None:
    from elucera import chats
    _thread(thread_id, request)
    chats.delete(thread_id, _owner(request))


@app.post("/chats/{thread_id}/jobs", status_code=201)
def attach_job(thread_id: str, req: ThreadAttach, request: Request) -> dict:
    from elucera import chats
    try:
        return chats.attach(thread_id, req.job_id, owner=_owner(request))
    except ValueError:
        raise HTTPException(400, "bad thread id")


@app.get("/analytics/dashboard")
def analytics_dashboard() -> dict:
    """Per-reel time + cost (measured or estimated), stage medians, and competitor price comparison."""
    from elucera import costs
    return costs.dashboard()


@app.get("/analytics/summary")
def analytics_summary() -> dict:
    from elucera import analytics
    return analytics.summary()


@app.post("/telemetry/event", status_code=204)
async def telemetry_event(request: Request):
    """Frontend product beacon. Best-effort: always 204, never leaks prompts."""
    from elucera import telemetry

    owner = _owner(request) or (request.query_params.get("uid") or "")[:64]
    try:
        body = await request.json()
    except Exception:
        return None
    if isinstance(body, dict):
        # Beacon path can't set headers, so allow the UID inside the payload too.
        uid = (body.get("uid") or body.get("props", {}).get("uid") or "") if isinstance(body.get("props"), dict) else (body.get("uid") or "")
        telemetry.record(body.get("event", ""), body.get("props") if isinstance(body.get("props"), dict) else {},
                         owner=owner or str(uid)[:64])
    return None


@app.get("/analytics/telemetry")
def analytics_telemetry(days: int = 14) -> dict:
    """Product-funnel aggregates: page views, demo, gallery, submits, approvals, redos."""
    from elucera import telemetry
    return telemetry.summary(max(1, min(days, 90)))


@app.get("/library/reels")
def list_reels() -> list[dict]:
    out = []
    for d in (get_settings().library_dir / "reels").glob("*/"):
        read = lambda n: json.loads((d / n).read_text()) if (d / n).exists() else None  # noqa: E731
        script = read("script.json") or {}
        plan = read("plan.json") or []
        audio = read("audio.json") or []
        topic = (d / "topic.txt").read_text().strip() if (d / "topic.txt").exists() else script.get("title", d.name)
        out.append({
            "name": d.name,
            "topic": topic,
            "title": script.get("title", topic),
            "hook": (script.get("segments") or [{}])[0].get("narration", ""),
            "renderers": sorted({p["renderer"] for p in plan}),
            "duration": round(sum(a.get("duration", 0) for a in audio), 1),
            "has_video": (d / "final.mp4").exists(),
            "mtime": d.stat().st_mtime,
        })
    return sorted(out, key=lambda r: -r["mtime"])


@app.get("/library/reels/{name}/video")
def reel_video(name: str) -> FileResponse:
    f = _reel_dir(name) / "final.mp4"
    if not f.exists():
        raise HTTPException(404, "video not stored locally")
    return FileResponse(f, media_type="video/mp4")


@app.get("/library/reels/{name}/strip")
def reel_strip(name: str) -> FileResponse:
    f = _reel_dir(name) / "strip.png"
    if not f.exists():
        raise HTTPException(404, "no strip")
    return FileResponse(f, media_type="image/png")


@app.get("/library/showcase")
def list_showcase() -> list[dict]:
    """Component-kit showreels for the home page (library/showcase/<id>/{meta.json, poster.jpg, clip.mp4})."""
    out = []
    for d in sorted((get_settings().library_dir / "showcase").glob("*/")):
        f = d / "meta.json"
        if f.exists():
            out.append({"id": d.name, **json.loads(f.read_text()), "has_video": (d / "clip.mp4").exists()})
    return sorted(out, key=lambda m: m.get("order", 99))


def _showcase_file(sid: str, name: str) -> FileResponse:
    root = (get_settings().library_dir / "showcase").resolve()
    f = (root / sid / name).resolve()
    if f.parent.parent != root or not f.exists():
        raise HTTPException(404, "not found")
    return FileResponse(f)


@app.get("/library/showcase/{sid}/video")
def showcase_video(sid: str) -> FileResponse:
    return _showcase_file(sid, "clip.mp4")


@app.get("/library/showcase/{sid}/poster")
def showcase_poster(sid: str) -> FileResponse:
    return _showcase_file(sid, "poster.jpg")


@app.get("/library/scenes")
def list_scenes() -> list[dict]:
    from elucera import library

    return [
        {"id": m.id, "renderer": m.renderer.value, "role": m.role, "topic": m.topic, "description": m.description[:220],
         "duration": m.duration, "starred": m.starred, "has_clip": (p / "clip.mp4").exists(),
         "has_player": (p / "player.js").exists()}
        for m, p in library.scenes()
    ]


def _scene_file(scene_id: str, name: str) -> FileResponse:
    root = (get_settings().library_dir / "scenes").resolve()
    f = (root / scene_id / name).resolve()
    if f.parent.parent != root or not f.exists():
        raise HTTPException(404, "not found")
    return FileResponse(f)


@app.get("/library/scenes/{scene_id}/clip")
def scene_clip(scene_id: str) -> FileResponse:
    return _scene_file(scene_id, "clip.mp4")


@app.get("/library/scenes/{scene_id}/thumb")
def scene_thumb(scene_id: str) -> FileResponse:
    return _scene_file(scene_id, "thumb.png")


@app.get("/library/scenes/{scene_id}/player")
def library_scene_player(scene_id: str) -> HTMLResponse:
    from elucera.render.player_bundle import player_page

    _scene_file(scene_id, "player.js")  # 404s unless the bundle exists
    return HTMLResponse(player_page(scene_id.replace("-", " ")))


@app.get("/library/scenes/{scene_id}/player.js")
def library_scene_player_js(scene_id: str) -> FileResponse:
    return _scene_file(scene_id, "player.js")


# Three.js is already installed for Remotion; serve that copy so the UI works offline.
app.mount("/vendor/three", StaticFiles(directory=ROOT / "remotion/node_modules/three/build"), name="three")
app.mount("/", StaticFiles(directory=ROOT / "web", html=True), name="web")
